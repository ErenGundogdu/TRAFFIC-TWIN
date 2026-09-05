export const themeInitializationScript = `
  try {
    const savedTheme = localStorage.getItem("traffic-twin-theme");
    document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "light";
  }
`;
