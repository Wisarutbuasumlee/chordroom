export type Theme = "light" | "dark";

export const THEME_KEY = "chordroom:theme";

// รันใน <head> ก่อนเบราว์เซอร์วาดหน้า: ใช้ค่าที่จำไว้ ถ้าไม่มีให้ตาม prefers-color-scheme
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`;

export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  window.dispatchEvent(new CustomEvent("chordroom:theme", { detail: theme }));
}
