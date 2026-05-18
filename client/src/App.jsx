import { useEffect, useMemo } from "react";
import "../../style.css";
import staticHtml from "../../index.html?raw";
import staticScript from "../../script.js?raw";

function getStaticBodyMarkup() {
  const bodyMatch = staticHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyMarkup = bodyMatch ? bodyMatch[1] : staticHtml;

  return bodyMarkup.replace(/<script[\s\S]*?<\/script>/gi, "");
}

function App() {
  const markup = useMemo(() => getStaticBodyMarkup(), []);

  useEffect(() => {
    if (window.__spendflowStaticScriptLoaded) return;

    window.__spendflowStaticScriptLoaded = true;

    const script = document.createElement("script");
    script.dataset.spendflowStaticScript = "true";
    script.textContent = staticScript;
    document.body.appendChild(script);
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}

export default App;
