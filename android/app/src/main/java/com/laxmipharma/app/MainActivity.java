package com.laxmipharma.app;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure clean white native status bar with dark icons
        try {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().setStatusBarColor(android.graphics.Color.WHITE);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = getWindow().getInsetsController();
                if (controller != null) {
                    controller.setSystemBarsAppearance(
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    );
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decorView = getWindow().getDecorView();
                int flags = decorView.getSystemUiVisibility();
                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                decorView.setSystemUiVisibility(flags);
            }
        } catch (Exception ignored) {}

        // Hardware accelerated WebView setup with zero-flash white background
        try {
            WebView webView = getBridge().getWebView();
            webView.setBackgroundColor(android.graphics.Color.WHITE);
            webView.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
            android.webkit.WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
        } catch (Exception ignored) {}

        // Register direct JavaScript Interface for WebView
        try {
            WebView webView = getBridge().getWebView();
            webView.post(() -> {
                try {
                    webView.addJavascriptInterface(new Object() {
                        @JavascriptInterface
                        public void exitApp() {
                            runOnUiThread(() -> {
                                try {
                                    moveTaskToBack(true);
                                } catch (Exception ignored) {}
                            });
                        }
                    }, "AndroidApp");
                } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}

        // Hardware Back Button navigation handling
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                try {
                    WebView webView = getBridge().getWebView();
                    String url = webView != null ? webView.getUrl() : "";
                    
                    // If currently on home page or cannot go back, minimize/close the app cleanly
                    boolean isHome = url == null || url.isEmpty() || url.endsWith("index.html") || url.endsWith("/#") || url.endsWith("/");
                    if (isHome || !webView.canGoBack()) {
                        moveTaskToBack(true);
                        return;
                    }
                    
                    if (webView.canGoBack()) {
                        webView.goBack();
                        return;
                    }
                } catch (Exception ignored) {}
                moveTaskToBack(true);
            }
        });
    }

    @Override
    public void onBackPressed() {
        try {
            WebView webView = getBridge().getWebView();
            String url = webView != null ? webView.getUrl() : "";
            boolean isHome = url == null || url.isEmpty() || url.endsWith("index.html") || url.endsWith("/#") || url.endsWith("/");
            if (isHome || !webView.canGoBack()) {
                moveTaskToBack(true);
                return;
            }
        } catch (Exception ignored) {}
        super.onBackPressed();
    }
}
