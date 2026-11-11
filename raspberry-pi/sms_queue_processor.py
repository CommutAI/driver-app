#!/usr/bin/env python3
"""
SMS Queue Processor for CommuteAI
Polls Supabase for pending SMS messages and sends them via SIM900A
"""

import os
import time
import logging
from datetime import datetime
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    logger.error("pyserial not installed")

try:
    from supabase import create_client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    logger.error("supabase not installed")

class SMSQueueProcessor:
    def __init__(self):
        self.serial_connection = None
        self.connected = False
        self.supabase = None
        self.port = os.getenv('SIM900A_PORT', '/dev/ttyUSB0')
        self.baudrate = int(os.getenv('SIM900A_BAUDRATE', '9600'))
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_KEY')
        self.poll_interval = int(os.getenv('SMS_POLL_INTERVAL', '10'))
        self.max_concurrent = int(os.getenv('MAX_CONCURRENT_SMS', '5'))
        self._init_supabase()
        self._connect_hardware()

    def _init_supabase(self):
        if not SUPABASE_AVAILABLE:
            logger.warning("Supabase client not available")
            return
        if not self.supabase_url or not self.supabase_key:
            logger.warning("Supabase credentials not configured")
            return
        try:
            self.supabase = create_client(self.supabase_url, self.supabase_key)
            logger.info("Supabase client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase: {e}")

    def _connect_hardware(self) -> bool:
        if not SERIAL_AVAILABLE:
            logger.error("Serial library not available")
            return False
        try:
            self.serial_connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=2
            )
            self.serial_connection.write(b'AT\r')
            time.sleep(0.5)
            response = self.serial_connection.read(100).decode('utf-8', errors='ignore')
            if 'OK' in response:
                self.connected = True
                logger.info(f"SIM900A connected on {self.port} @ {self.baudrate} baud")
                return True
            else:
                logger.error(f"SIM900A did not respond with OK. Response: {response}")
                return False
        except serial.SerialException as e:
            logger.error(f"Failed to connect to SIM900A: {e}")
            return False
        except Exception as e:
            logger.error(f"Hardware connection error: {e}")
            return False

    def _normalize_phone_number(self, phone_number: str) -> str:
        phone_number = phone_number.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if phone_number.startswith('0'):
            phone_number = '+63' + phone_number[1:]
        elif phone_number.startswith('63') and not phone_number.startswith('+'):
            phone_number = '+' + phone_number
        elif not phone_number.startswith('+'):
            phone_number = '+63' + phone_number
        return phone_number

    def send_sms(self, phone_number: str, message: str) -> bool:
        if not self.connected:
            logger.error("Cannot send SMS - SIM900A not connected")
            return False
        try:
            normalized_phone = self._normalize_phone_number(phone_number)
            logger.info(f"Sending SMS to {normalized_phone}: {message[:50]}...")
            self.serial_connection.write(b'AT+CMGF=1\r')
            time.sleep(0.5)
            self.serial_connection.write(f'AT+CMGS="{normalized_phone}"\r'.encode())
            time.sleep(2)  # INCREASED from 1 to 2
            self.serial_connection.write(f'{message}\x1A'.encode())
            time.sleep(8)  # INCREASED from 5 to 8
            response = ""
            for _ in range(10):
                if self.serial_connection.in_waiting > 0:
                    response += self.serial_connection.read(self.serial_connection.in_waiting).decode('utf-8', errors='ignore')
                time.sleep(0.5)
            response = response.strip()
            logger.info(f"SIM900A response: {response}")
            if 'ERROR' in response:
                logger.error(f"Failed to send SMS to {normalized_phone}: SIM900A returned ERROR")
                return False
            if '+CMGS:' in response:
                logger.info(f"SMS sent successfully to {normalized_phone}")
                return True
            else:
                logger.error(f"Failed to send SMS to {normalized_phone}: No +CMGS: confirmation")
                return False
        except Exception as e:
            logger.error(f"SMS sending error: {e}")
            return False

    def fetch_pending_sms(self) -> List[Dict]:
        if not self.supabase:
            logger.warning("Cannot fetch SMS - Supabase not initialized")
            return []
        try:
            try:
                response = self.supabase.table('sms_queue') \
                    .select('*') \
                    .in_('status', ['pending', 'failed', 'retrying']) \
                    .lt('retry_count', 3) \
                    .order('priority', desc=True) \
                    .order('created_at', desc=False) \
                    .limit(self.max_concurrent) \
                    .execute()
            except Exception as e:
                logger.info(f"retry_count column not found, trying 'attempts' column: {e}")
                try:
                    response = self.supabase.table('sms_queue') \
                        .select('*') \
                        .in_('status', ['pending', 'failed', 'retrying']) \
                        .lt('attempts', 3) \
                        .order('priority', desc=True) \
                        .order('created_at', desc=False) \
                        .limit(self.max_concurrent) \
                        .execute()
                except:
                    response = self.supabase.table('sms_queue') \
                        .select('*') \
                        .in_('status', ['pending', 'failed']) \
                        .lt('attempts', 3) \
                        .order('created_at', desc=False) \
                        .limit(self.max_concurrent) \
                        .execute()
            if response.data:
                logger.info(f"Fetched {len(response.data)} pending SMS messages")
                return response.data
            else:
                logger.debug("No pending SMS messages")
                return []
        except Exception as e:
            logger.error(f"Failed to fetch pending SMS: {e}")
            return []

    def update_sms_status(self, sms_id: str, status: str, error_message: str = None):
        if not self.supabase:
            return
        try:
            current_sms = self.supabase.table('sms_queue').select('*').eq('id', sms_id).execute()
            if not current_sms.data:
                logger.error(f"SMS {sms_id} not found")
                return
            sms_data = current_sms.data[0]
            attempts_col = 'retry_count' if 'retry_count' in sms_data else 'attempts'
            current_retry_count = sms_data.get(attempts_col, 0)
            max_retries = sms_data.get('max_retries', 3)
            new_retry_count = current_retry_count + 1
            update_data = {'status': status, attempts_col: new_retry_count}
            if status == 'sent':
                update_data['sent_at'] = datetime.now().isoformat()
            if status == 'failed':
                update_data['failed_at'] = datetime.now().isoformat()
            if error_message:
                update_data['error_message'] = error_message
            if status == 'failed' and new_retry_count >= max_retries:
                update_data['status'] = 'permanently_failed'
                logger.warning(f"SMS {sms_id} marked as permanently failed after {new_retry_count} attempts")
            self.supabase.table('sms_queue').update(update_data).eq('id', sms_id).execute()
        except Exception as e:
            logger.error(f"Failed to update SMS status: {e}")

    def process_queue(self):
        pending_sms = self.fetch_pending_sms()
        emergency_count = 0
        regular_count = 0
        sent_count = 0
        failed_count = 0
        for sms in pending_sms:
            sms_id = sms['id']
            phone_number = sms['phone_number']
            message = sms['message']
            sms_type = sms.get('sms_type', 'unknown')
            priority = sms.get('priority', 5)
            metadata = sms.get('metadata', {})
            is_emergency = sms_type == 'emergency'
            if is_emergency:
                emergency_count += 1
                emergency_type = metadata.get('emergency_type', 'Unknown')
                bus_number = metadata.get('bus_number', 'Unknown')
                driver_name = metadata.get('driver_name', 'Unknown')
                logger.warning(f"🚨 EMERGENCY ALERT 🚨 Type: {emergency_type}, Bus: {bus_number}, Driver: {driver_name}")
                logger.warning(f"📱 Sending emergency SMS to {phone_number}")
            else:
                regular_count += 1
                logger.info(f"Processing SMS {sms_id} ({sms_type}, priority: {priority})")
            try:
                self.supabase.table('sms_queue').update({'status': 'retrying'}).eq('id', sms_id).execute()
            except:
                pass
            success = self.send_sms(phone_number, message)
            if success:
                sent_count += 1
                if is_emergency:
                    logger.warning(f"✅ Emergency SMS sent successfully to {phone_number}")
                self.update_sms_status(sms_id, 'sent')
            else:
                failed_count += 1
                if is_emergency:
                    logger.error(f"❌ FAILED to send emergency SMS to {phone_number}")
                self.update_sms_status(sms_id, 'failed', 'Failed to send via SIM900')
            if is_emergency:
                time.sleep(3)
            else:
                time.sleep(2)
        if pending_sms:
            logger.info(f"📊 Batch Summary: {len(pending_sms)} total ({emergency_count} emergency, {regular_count} regular) - {sent_count} sent, {failed_count} failed")
            if emergency_count > 0:
                logger.warning(f"🚨 Emergency batch completed: {sent_count}/{emergency_count} emergency SMS sent successfully")

    def run(self):
        logger.info("Starting SMS queue processor...")
        if not self.supabase:
            logger.error("Cannot start - Supabase not initialized")
            return
        if not self.connected:
            logger.warning("Starting without SIM900 - will fail to send SMS")
        while True:
            try:
                self.process_queue()
                logger.info(f"Sleeping for {self.poll_interval} seconds...")
                time.sleep(self.poll_interval)
            except KeyboardInterrupt:
                logger.info("Shutting down...")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(self.poll_interval)

    def disconnect(self):
        if self.serial_connection:
            self.serial_connection.close()
            self.connected = False
            logger.info("SIM900A disconnected")

def main():
    print("=" * 70)
    print("📱 SMS Queue Processor - CommuteAI")
    print("=" * 70)
    print()
    processor = SMSQueueProcessor()
    print("Status:")
    print(f"  Supabase: {'Connected' if processor.supabase else 'Not connected'}")
    print(f"  SIM900: {'Connected' if processor.connected else 'Not connected'}")
    print(f"  Poll Interval: {processor.poll_interval} seconds")
    print(f"  Max Concurrent: {processor.max_concurrent}")
    print()
    try:
        processor.run()
    finally:
        processor.disconnect()

if __name__ == "__main__":
    main()
