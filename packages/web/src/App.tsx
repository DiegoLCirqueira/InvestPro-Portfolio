import { Router } from "./app/router";
import { useDocumentTitle } from "./app/use-document-title";

function App() {
  useDocumentTitle();
  return <Router />;
}

export default App;
