package com.ticarnet.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    enforceFreshWebContent();
  }

  @Override
  public void onResume() {
    super.onResume();
    enforceFreshWebContent();
  }

  private void enforceFreshWebContent() {
    if (getBridge() == null) return;

    WebView webView = getBridge().getWebView();
    if (webView == null) return;

    try {
      webView.clearCache(true);
      webView.clearHistory();
      WebSettings settings = webView.getSettings();
      if (settings != null) {
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
      }
    } catch (Throwable ignored) {
      // WebView cache ayari best-effort calisir; hata olursa uygulama akisini bozma.
    }
  }
}
