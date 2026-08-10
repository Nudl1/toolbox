"use strict";

const Theme = {
  KEY: "toolbox-theme",

  apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(this.KEY, theme);
    const btn = document.getElementById("themeBtn");
    if (btn) btn.textContent = theme === "dark" ? "Light" : "Dark";
  },

  toggle() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    this.apply(current === "dark" ? "light" : "dark");
  },

  init() {
    this.apply(localStorage.getItem(this.KEY) || "dark");
    const btn = document.getElementById("themeBtn");
    if (btn) btn.addEventListener("click", () => this.toggle());
  }
};
