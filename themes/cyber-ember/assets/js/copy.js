
(function () {
  'use strict';

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(ta);
    }

    return Promise.resolve();
  }

  function flash(el, label) {
    const prev = el.getAttribute('data-label') || el.textContent;
    el.textContent = label;
    window.setTimeout(() => {
      el.textContent = prev;
    }, 1600);
  }

  function enhanceCodeBlocks() {
    document.querySelectorAll(
      '.prose-ember pre, .terminal-window pre'
    ).forEach((pre) => {
      if (
        pre.parentElement &&
        pre.parentElement.classList.contains('code-block')
      ) {
        return;
      }

      const wrap = document.createElement('div');
      wrap.className = 'code-block';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      btn.setAttribute('data-label', 'Copy');
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code');

      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        copyText((code || pre).innerText.replace(/\n$/, ''))
          .then(() => flash(btn, 'Copied'));
      });

      wrap.appendChild(btn);
    });
  }

  function enhanceShareSection() {
    const sections = document.querySelectorAll('[data-share-section]');
    if (!sections.length) return;

    sections.forEach((section) => {
      const notification = section.querySelector('.share-notification');
      let notifyTimeout = null;

      function showNotification(msg, isError) {
        if (!notification) return;

        notification.textContent = msg;

        notification.classList.remove(
          'opacity-0',
          'text-ember-soft',
          'text-red-400',
          'text-green-400'
        );

        notification.classList.add(
          isError ? 'text-red-400' : 'text-ember-soft',
          'opacity-100'
        );

        clearTimeout(notifyTimeout);

        notifyTimeout = setTimeout(() => {
          notification.classList.remove('opacity-100');
          notification.classList.add('opacity-0');
        }, 3500);
      }

      // Current page URL and title
      const currentUrl = window.location.href;
      const currentTitle = document.title || '';

      // LinkedIn
      const linkedinBtn = section.querySelector(
        '[data-share-channel="linkedin"]'
      );

      if (linkedinBtn) {
        linkedinBtn.href =
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
      }

      // X
      const xBtn = section.querySelector(
        '[data-share-channel="x"]'
      );

      if (xBtn) {
        xBtn.href =
          `https://x.com/intent/post?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(currentTitle)}`;
      }

      // Telegram
      const telegramBtn = section.querySelector(
        '[data-share-channel="telegram"]'
      );

      if (telegramBtn) {
        telegramBtn.href =
          `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(currentTitle)}`;
      }

      // WhatsApp: share the current page URL and title
      const whatsappBtn = section.querySelector(
        '[data-share-channel="whatsapp"]'
      );

      if (whatsappBtn) {
        const message = `${currentTitle} ${currentUrl}`;

        whatsappBtn.href =
          `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      }

      // Instagram: copy the current page URL and open Instagram
      const instagramBtn = section.querySelector(
        '[data-share-channel="instagram"]'
      );

      if (instagramBtn) {
        instagramBtn.addEventListener('click', () => {
          copyText(currentUrl)
            .then(() => {
              showNotification(
                'Page URL copied! Paste it into your Instagram post or Story.',
                false
              );
            })
            .catch(() => {
              showNotification(
                'Copy failed. Copy the page URL from your browser address bar.',
                true
              );
            });
        });
      }

      // Discord: copy the current page URL
      const discordBtn = section.querySelector(
        '[data-share-channel="discord"]'
      );

      if (discordBtn) {
        discordBtn.addEventListener('click', () => {
          copyText(currentUrl)
            .then(() => {
              showNotification(
                'Link copied! Paste it into your Discord server or message.',
                false
              );
            })
            .catch(() => {
              showNotification(
                'Opening Discord. Copy the URL from your browser address bar.',
                true
              );
            });
        });
      }

      // GitHub: copy the current page URL
      const githubBtn = section.querySelector(
        '[data-share-channel="github"]'
      );

      if (githubBtn) {
        githubBtn.addEventListener('click', () => {
          copyText(currentUrl)
            .then(() => {
              showNotification(
                'Link copied! Paste it wherever you want to share it on GitHub.',
                false
              );
            })
            .catch(() => {
              showNotification(
                'Opening GitHub. Copy the URL from your browser address bar.',
                true
              );
            });
        });
      }

      // Copy Link Button
      const copyBtn = section.querySelector(
        '[data-share-channel="copy"]'
      );

      if (copyBtn) {
        const labelEl = copyBtn.querySelector('.share-btn-label');
        const defaultIcon = copyBtn.querySelector('.share-icon-default');
        const successIcon = copyBtn.querySelector('.share-icon-success');

        const originalLabel = labelEl
          ? labelEl.textContent
          : 'Copy Link';

        let copyTimeout = null;

        copyBtn.addEventListener('click', (e) => {
          e.preventDefault();

          copyText(currentUrl)
            .then(() => {
              copyBtn.classList.add('share-btn-copied');

              if (labelEl) {
                labelEl.textContent = 'Copied!';
              }

              if (defaultIcon) {
                defaultIcon.classList.add('hidden');
              }

              if (successIcon) {
                successIcon.classList.remove('hidden');
              }

              copyBtn.setAttribute('title', 'Link copied!');
              copyBtn.setAttribute('aria-label', 'Link copied!');

              showNotification(
                'Link copied to clipboard!',
                false
              );

              clearTimeout(copyTimeout);

              copyTimeout = setTimeout(() => {
                copyBtn.classList.remove('share-btn-copied');

                if (labelEl) {
                  labelEl.textContent = originalLabel;
                }

                if (defaultIcon) {
                  defaultIcon.classList.remove('hidden');
                }

                if (successIcon) {
                  successIcon.classList.add('hidden');
                }

                copyBtn.setAttribute(
                  'title',
                  'Copy link to clipboard'
                );

                copyBtn.setAttribute(
                  'aria-label',
                  'Copy link to clipboard'
                );
              }, 2000);
            })
            .catch(() => {
              if (labelEl) {
                labelEl.textContent = 'Failed';
              }

              showNotification(
                'Unable to copy automatically. Copy the URL from your browser address bar.',
                true
              );

              setTimeout(() => {
                if (labelEl) {
                  labelEl.textContent = originalLabel;
                }
              }, 2500);
            });
        });
      }
    });
  }

  function init() {
    enhanceCodeBlocks();
    enhanceShareSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
