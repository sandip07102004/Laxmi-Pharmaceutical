package com.laxmipharma.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure clean white native status bar with dark icons
        try {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().setStatusBarColor(Color.WHITE);
            getWindow().setBackgroundDrawable(new ColorDrawable(Color.WHITE));

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

        // Prevent status bar and display cutout overlap on Android 15+ (Edge-to-Edge) and earlier versions
        try {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
            View contentView = findViewById(android.R.id.content);
            if (contentView != null) {
                contentView.setBackgroundColor(Color.WHITE);
                ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                    Insets insets = windowInsets.getInsets(
                        WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
                    );
                    v.setPadding(0, insets.top, 0, 0);
                    return windowInsets;
                });
                ViewCompat.requestApplyInsets(contentView);
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
