/*!
 * nisab-notice.js
 * Privacy & disclaimer notice banner for nisab.tahababa.com
 * Usage: <script src="nisab-notice.js"></script>
 */
(function () {
  "use strict";

  var SESSION_KEY = "nisab_notice_dismissed";
  var githubUrl = "https://github.com/tahababa/nisab-al-zakat";

  /* ── Styles ─────────────────────────────────────────────── */
  (function () {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/popup.css";
    document.head.appendChild(link);
  })();

  /* ── HTML ───────────────────────────────────────────────── */
  var items = [
    "No data is collected at any level. The only file written to is <strong>nisab.json</strong>, which stores the calculated Nisab thresholds. No cookies. No localStorage. No tracking.",
    "This is not a fatwa. I am not a mufti. These calculations are offered in good faith and may contain errors. If you spot something wrong, please be kind and reach out at <a href='mailto:info@tahababa.com'>info@tahababa.com</a>.",
    "Gold and silver prices are fetched from <a href='https://goldpricez.com' target='_blank' rel='noopener'>goldpricez.com</a> and currency rates from <a href='https://github.com/fawazahmed0/exchange-api' target='_blank' rel='noopener'>@fawazahmed0/currency-api</a> (150+ currencies, free, no key).",
  ];

  function buildBanner() {
    var itemsHtml = items
      .map(function (text) {
        return (
          "<div class='nisab-item'>" +
          "<div class='nisab-dot'></div>" +
          "<span>" +
          text +
          "</span>" +
          "</div>"
        );
      })
      .join("");

    return (
      "<div id='nisab-notice-banner' role='note' aria-label='Privacy and disclaimer notice'>" +
      "<div class='nisab-icon'>☪️</div>" +
      "<div class='nisab-content'>" +
      itemsHtml +
      "</div>" +
      "<button id='nisab-notice-close' aria-label='Dismiss notice' title='Dismiss'>✕</button>" +
      "</div>"
    );
  }

  function buildTrigger() {
    return "<button id='nisab-notice-trigger' aria-label='Show privacy and disclaimer notice' title='Privacy and disclaimer'>i</button>";
  }

  /* ── Logic ──────────────────────────────────────────────── */
  function showBanner() {
    var existing = document.getElementById("nisab-notice-banner");
    if (existing) return;

    var div = document.createElement("div");
    div.innerHTML = buildBanner();
    document.body.appendChild(div.firstChild);

    document
      .getElementById("nisab-notice-close")
      .addEventListener("click", dismissBanner);

    var trigger = document.getElementById("nisab-notice-trigger");
    if (trigger) trigger.classList.remove("nisab-visible");
  }

  function dismissBanner() {
    var banner = document.getElementById("nisab-notice-banner");
    if (banner) {
      banner.style.transition = "opacity 0.25s, transform 0.25s";
      banner.style.opacity = "0";
      banner.style.transform = "translateY(100%)";
      setTimeout(function () {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
        var trigger = document.getElementById("nisab-notice-trigger");
        if (trigger) trigger.classList.add("nisab-visible");
      }, 260);
    }
    try {
      localStorage.setItem(SESSION_KEY, "1");
    } catch (e) {}
  }

  function init() {
    /* Inject i trigger button */
    var triggerDiv = document.createElement("div");
    triggerDiv.innerHTML = buildTrigger();
    document.body.appendChild(triggerDiv.firstChild);

    var trigger = document.getElementById("nisab-notice-trigger");

    trigger.addEventListener("click", function () {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (e) {}
      trigger.classList.remove("nisab-visible");
      showBanner();
    });

    /* If previously dismissed: show i icon. Otherwise: show banner. */
    var dismissed = false;
    try {
      dismissed = localStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {}

    if (dismissed) {
      trigger.classList.add("nisab-visible");
    } else {
      showBanner();
    }
  }

  /* Run after DOM is ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
