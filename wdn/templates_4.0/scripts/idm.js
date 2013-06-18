define(['wdn'], function(WDN) {
    var getLinkByRel = function(name) {
            if (document.querySelectorAll) {
                return document.querySelectorAll('link[rel=' + name + ']')[0] || null;
            }

            var links = document.getElementsByTagName('link');
            for (var i = 0; i < links.length; i++) {
                if (links[i].getAttribute('rel') === name) {
                    return links[i];
                }
            }
            return null;
        },
        getLocalIdmSettings = function() {
            var loginLink = getLinkByRel('login'),
                logoutLink = getLinkByRel('logout');

            if (loginLink) {
                WDN.setPluginParam('idm', 'login', loginLink.getAttribute('href'));
            }
            if (logoutLink) {
                WDN.setPluginParam('idm', 'logout', logoutLink.getAttribute('href'));
            }

            return WDN.getPluginParam('idm') || {};
        },
        loginSrv = 'https://login.unl.edu/',
        encLoc = encodeURIComponent(window.location),
        logoutURL = loginSrv + 'cas/logout?url=' + encLoc,
        loginURL = loginSrv + 'cas/login?service=' + encLoc,
        serviceURL = loginSrv + 'services/whoami/?id=',
        planetRed = '//planetred.unl.edu/pg/',
        user = false;

    var displayName = function(uid) {
        var disp_name = '';
        if (user.uid && user.uid === uid && user.cn) {
            for (var i in user.cn) {
                if (!disp_name || user.cn[i].length < disp_name.length) {
                    disp_name = user.cn[i];
                }
            }
        } else {
            disp_name = uid;
        }

        return disp_name;
    };

    var Plugin = {
        initialize : function(callback) {
            var localSettings = getLocalIdmSettings(),
                loginCheckFailure = function() {
                    if (localSettings.login) {
                        Plugin.setLoginURL(localSettings.login);
                    } else {
                        Plugin.displayLogin();
                    }

                    if (callback) {
                        callback();
                    }
                };

            if (WDN.getCookie('unl_sso')) {
                require([serviceURL + WDN.getCookie('unl_sso')], function() {
                    if (WDN.idm.user) {
                        user = WDN.idm.user;
                        delete WDN.idm.user;
                    }

                    if (Plugin.getUserId()) {
                        if (typeof user.eduPersonPrimaryAffiliation[0] !== "undefined") {
                            _gaq.push(['wdn._setCustomVar', 1, 'Primary Affiliation', user.eduPersonPrimaryAffiliation[0], 1]);
                            WDN.log("Tracking primary affiliation: "+user.eduPersonPrimaryAffiliation[0]);
                        }
                        if (callback) {
                            callback();
                        }
                        Plugin.displayNotice(Plugin.getUserId());
                    } else {
                        // User's CAS session is no longer active, kill cookie
                        Plugin.logout();
                        loginCheckFailure();
                    }
                });
            } else {
                loginCheckFailure();
            }
        },

        logout : function() {
            WDN.setCookie('unl_sso', '0', -1);
            user = false;
        },

        /**
         * Checks if the user is logged in
         *
         * @return bool
         */
        isLoggedIn : function() {
            return !!Plugin.getUserId();
        },

        /**
         * Returns the uid of the logged in user.
         *
         * @return string
         */
        getUserId : function() {
            return user && user.uid;
        },

        /**
         * Update the SSO tab and display user info
         *
         * @param {string} uid
         */
        displayNotice : function(uid) {
            var localSettings = getLocalIdmSettings(),
                idm = document.getElementById('wdn_identity_management');

            idm.className = idm.className.replace(/(^|\s)(hidden|loggedin)(\s|$)/, '');

            var icon = '';
            // in planet red's use of CAS, staff usernames are converted like jdoe2 -> unl_jdoe2
            //  and student usernames are converted like s-jdoe3 -> unl_s_jdoe3
            var planetred_uid;
            if (uid.substring(2,0) == 's-') {
                planetred_uid = 'unl_' + uid.replace('-','_');
            } else {
                planetred_uid = 'unl_' + uid;
            }
            var user_profiles = document.getElementsByClassName('wdn_idm_user_profile');

            for (var j = 0; j < user_profiles.length; j++) {
                user_profiles[j].setAttribute('href', 'http:' + planetRed + 'profile/'+planetred_uid);
                user_profiles[j].setAttribute('title', 'Review and update your profile');
            }
            document.getElementById('wdn_idm_userpic').setAttribute('src', planetRed + 'icon/'+planetred_uid+'/topbar/');
            var username = document.getElementById('wdn_idm_username');
            while (username.firstChild) {
                username.removeChild(username.firstChild);
            }
            username.appendChild(document.createTextNode(displayName(uid)));
            idm.className += ' loggedin';

            // Any time logout link is clicked, unset the user data
            var logoutLink = document.getElementById('wdn_idm_logout').getElementsByTagName('a')[0];
            if (logoutLink.addEventListener) {
                logoutLink.removeEventListener('click', Plugin.logout, false);
                logoutLink.addEventListener('click', Plugin.logout, false);
            } else if (logoutLink.attachEvent) {
                logoutLink.detachEvent('onclick', Plugin.logout);
                logoutLink.attachEvent('onclick', Plugin.logout);
            }

            if (localSettings.logout) {
                Plugin.setLogoutURL(localSettings.logout);
            }
        },

        displayLogin : function() {
            var idm = document.getElementById('wdn_identity_management'),
                loginLinks = WDN.jQuery('.wdn-idm-login');

            if (null === idm) {
                return;
            }

            idm.className = idm.className.replace(/(^|\s)hidden(\s|$)/, '');
            loginLinks.each(function () {
                WDN.jQuery(this).attr('href', loginURL);
            });
        },

        /**
         * Set the URL to send the user to when the logout link is clicked
         */
        setLogoutURL : function(url) {
            var logoutLink = document.getElementById('wdn_idm_logout').getElementsByTagName('a')[0];
            logoutLink.setAttribute('href', url);
            logoutURL = url;
        },

        /**
         * Set the URL to send the user to when the login link is clicked
         */
        setLoginURL : function(url) {
            if (url) {
                loginURL = url;
            }
            Plugin.displayLogin();
        }
    };

    WDN.idm = {};
    return Plugin;
});
