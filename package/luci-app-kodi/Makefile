include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-kodi
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-kodi
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI for Kodi (status / control / web remote)
  DEPENDS:=+luci-base
  PKGARCH:=all
endef

define Package/luci-app-kodi/description
  Kodi 状态与控制页（服务启停/重启、开机自启、三通道说明、存储卡列表、时区提示），
  以及 Chorus2 网页遥控（8080）内嵌页。Kodi 本体需另行提供（见 README）。
endef

define Package/luci-app-kodi/install
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/kodi
	$(INSTALL_DATA) ./files/www/luci-static/resources/view/kodi/status.js $(1)/www/luci-static/resources/view/kodi/
	$(INSTALL_DATA) ./files/www/luci-static/resources/view/kodi/web.js $(1)/www/luci-static/resources/view/kodi/
	$(INSTALL_DATA) ./files/www/luci-static/resources/view/kodi/guide.js $(1)/www/luci-static/resources/view/kodi/
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./files/usr/share/luci/menu.d/luci-app-kodi.json $(1)/usr/share/luci/menu.d/
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./files/usr/share/rpcd/acl.d/luci-app-kodi.json $(1)/usr/share/rpcd/acl.d/
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
endef

define Build/Compile
endef

$(eval $(call BuildPackage,luci-app-kodi))