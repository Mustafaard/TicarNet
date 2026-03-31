package com.ticarnet.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    applyWebViewSettings();
  }

  private void applyWebViewSettings() {
    if (getBridge() == null) return;

    WebView webView = getBridge().getWebView();
    if (webView == null) return;

    try {
      WebSettings settings = webView.getSettings();
      if (settings != null) {
        // LOAD_DEFAULT: use HTTP cache headers properly.
        // Static assets (JS/CSS/images) are cached; API fetch() calls bypass this.
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
      }
    } catch (Throwable ignored) {
      // best-effort
    }
  }
}
