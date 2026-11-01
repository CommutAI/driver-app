package com.driver.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Enable better WebView settings for maps
    this.getBridge().getWebView().getSettings().setDomStorageEnabled(true);
    this.getBridge().getWebView().getSettings().setDatabaseEnabled(true);
    this.getBridge().getWebView().getSettings().setGeolocationEnabled(true);
  }
}
