(function () {
  'use strict';

  function getAutoTheme() {
    var h = new Date().getHours();
    return h >= 6 && h < 18 ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('nisab-theme', theme); } catch (e) {}
  }

  window.toggleTheme = function () {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  // FOUC script in <head> sets the theme attribute immediately.
  // This file only needs to set it if somehow it wasn't set yet.
  if (!document.documentElement.getAttribute('data-theme')) {
    var saved;
    try { saved = localStorage.getItem('nisab-theme'); } catch (e) {}
    applyTheme(saved || getAutoTheme());
  }
}());
