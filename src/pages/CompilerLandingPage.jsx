// src/components/CodeEditor.jsx
import { useRef, useState, useEffect, useCallback } from "react";
import TopBar from "../components/TopBar";
import FileBar from "../components/FileBar";
import { executeCode } from "../utils/api.js";
import Output from "../components/Output";
import CodeMate from "../components/ChatBot/CodeMate";





import { CODE_SNIPPETS } from "../utils/constant";
import CodeEditorWindow from "../components/CodeEditorWindow";
import useKeyPress from "../hooks/keyPress";
import { useTheme } from "../context/ThemeContext"; // Import useTheme hook

const TOP_BAR_HEIGHT = 40; // px
const FILE_BAR_HEIGHT = 50; // px

const CodeEditor = () => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const { theme } = useTheme(); // Get the current theme

  // File management states
  const [openFiles, setOpenFiles] = useState([
    {
      id: "file1",
      name: "main.js",
      content: CODE_SNIPPETS["javascript"],
      language: "javascript",
    },
  ]);
  const [activeFileId, setActiveFileId] = useState("file1");

  // Derive current file's properties
  const activeFile = openFiles.find((f) => f.id === activeFileId);
  const [language, setLanguage] = useState(
    activeFile?.language || "javascript"
  );
  const [version, setVersion] = useState("");
  const [code, setCode] = useState(openFiles[activeFileId]?.content || "");

  const [showOutput, setShowOutput] = useState(false); // State to control output panel visibility

  // Editor height calculation: always full height below the bars
  const [editorHeight, setEditorHeight] = useState(
    () => window.innerHeight - TOP_BAR_HEIGHT - FILE_BAR_HEIGHT
  );
  const [output, setOutput] = useState({
    stdout: "",
    stderr: "",
    compile_output: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Custom hook for keyboard shortcuts
  const enterPress = useKeyPress("Enter");
  const ctrlPress = useKeyPress("Control");

  // Callback for when Monaco Editor mounts
  const onMount = useCallback(
    (editor) => {
      editorRef.current = editor;
      editor.focus(); // Focus the editor on mount
      editorRef.current.setValue(code); // Set initial code based on active file
    },
    [code]
  );

  // Callback for code changes in the editor
  const onCodeChange = useCallback(
    (newCode) => {
      setCode(newCode);
      setOpenFiles((prevFiles) => {
        const updatedFiles = prevFiles.map((f) =>
          f.id === activeFileId ? { ...f, content: newCode } : f
        );
        return updatedFiles;
      });
    },
    [activeFileId]
  );

  console.log(openFiles);

  // Callback for language selection
  const onLanguageSelect = useCallback(
    (newLanguage) => {
      setLanguage(newLanguage);
      // Update the language of the active file in the openFiles state
      setOpenFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === activeFileId ? { ...f, language: newLanguage } : f
        )
      );

      // Set editor content to a new snippet for the selected language if available
      const newCodeSnippet = CODE_SNIPPETS[newLanguage] || "";
      setCode(newCodeSnippet);
      if (editorRef.current) {
        editorRef.current.setValue(newCodeSnippet);
      }
    },
    [activeFileId]
  );

  // Callback for version selection (placeholder for future functionality)
  const onVersionSelect = useCallback((newVersion) => {
    setVersion(newVersion);
  }, []);

  // Callback for file selection
  const onFileSelect = useCallback(
    (id) => {
      if (editorRef.current) {
        const currentContent = editorRef.current.getValue();
        console.log(currentContent);
        setOpenFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === activeFileId ? { ...f, content: currentContent } : f
          )
        );
      }

      const selectedFile = openFiles.find((f) => f.id === id);
      if (selectedFile) {
        setActiveFileId(id);
        setLanguage(selectedFile.language || "javascript");
        setCode(selectedFile.content);
        
      }
    },
    [openFiles, activeFileId]
  );

  // Callback for closing a file
  const onFileClose = useCallback(
    (idToClose) => {
      setOpenFiles((prevFiles) => {
        const remainingFiles = prevFiles.filter((f) => f.id !== idToClose);

        // If no files left, create a default untitled file
        if (remainingFiles.length === 0) {
          const newFileId = `file-${Date.now()}`;
          const newFile = {
            id: newFileId,
            name: `untitled.js`,
            content: CODE_SNIPPETS["javascript"],
            language: "javascript",
          };
          setActiveFileId(newFileId);
          setLanguage("javascript");
          setCode(newFile.content);
          if (editorRef.current) {
            editorRef.current.setValue(newFile.content);
          }
          return [newFile];
        }

        // If the closed file was the active one, switch to the first remaining file
        if (activeFileId === idToClose) {
          const newActive = remainingFiles[0];
          setActiveFileId(newActive.id);
          setLanguage(newActive.language || "javascript");
          setCode(newActive.content);
          if (editorRef.current) {
            editorRef.current.setValue(newActive.content);
          }
        }
        return remainingFiles;
      });
    },
    [activeFileId]
  );

  // Callback for creating a new file
  const onNewFile = useCallback(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.getValue();
      setOpenFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === activeFileId ? { ...f, content: currentContent } : f
        )
      );
    }

    const newFileId = `file-${Date.now()}`;
    const newFileName = `untitled-${openFiles.length + 1}.js`;
    const newFile = {
      id: newFileId,
      name: newFileName,
      content: "",
      language: "javascript",
    };

    setOpenFiles((prevFiles) => [...prevFiles, newFile]);
    setActiveFileId(newFileId);
    setLanguage("javascript");
    setCode(""); // New file starts empty
  }, [openFiles.length, activeFileId]);

  // Function to run the code
  const runCode = useCallback(async () => {
    const sourceCode = editorRef.current?.getValue();
    if (!sourceCode) return; // Don't run if editor is empty

    try {
      setIsLoading(true);
      const { run: result } = await executeCode(language, sourceCode);
      setOutput(result || { stdout: "", stderr: "", compile_output: "" }); // Ensure all fields are present
      setIsError(!!result?.stderr || !!result?.compile_output); // Set error if stderr or compile_output exist
      setShowOutput(true); // Always show output when attempting to run
    } catch (error) {
      console.error("Error during code execution:", error);
      setOutput({
        stdout: "",
        stderr: `Execution Error: ${error.message || "Unable to run code"}`,
        compile_output: "",
      });
      setIsError(true);
      setShowOutput(true);
    } finally {
      setIsLoading(false);
    }
  }, [language]); // Depend on language to ensure latest selected language is used

  // Effect for Ctrl + Enter shortcut to run code
  useEffect(() => {
    if (enterPress && ctrlPress) {
      runCode();
    }
  }, [ctrlPress, enterPress, runCode]);

  // Effect to update editor height on window resize
  useEffect(() => {
    const updateEditorHeight = () => {
      setEditorHeight(window.innerHeight - TOP_BAR_HEIGHT - FILE_BAR_HEIGHT);
    };

    window.addEventListener("resize", updateEditorHeight);
    updateEditorHeight(); // Initial height calculation

    return () => window.removeEventListener("resize", updateEditorHeight); // Cleanup
  }, []); // Runs once on mount and cleans up on unmount

  return (
    <div
      className={`w-full h-screen flex flex-col overflow-hidden
                  ${
                    theme === "dark"
                      ? "bg-dark-background-primary"
                      : "bg-light-background-primary"
                  }`} // Use theme background
      ref={containerRef}
    >
      <TopBar />

      <FileBar
        language={language}
        onLanguageSelect={onLanguageSelect}
        onRunCode={runCode}
        isLoading={isLoading}
        openFiles={openFiles}
        activeFileId={activeFileId}
        onFileSelect={onFileSelect}
        onFileClose={onFileClose}
        onNewFile={onNewFile}
        onVersionSelect={onVersionSelect}
      />

      {/* Main content area: Editor */}
      <div
        className="flex flex-col flex-grow relative overflow-hidden rounded shadow-lg m-1"
        // style={{ marginTop: `${TOP_BAR_HEIGHT + FILE_BAR_HEIGHT + 8}px` }}
      >
        <CodeEditorWindow
          className="relative rounded-lg overflow-hidden"
          style={{ height: `${editorHeight}px` }}
          onChange={onCodeChange}
          activeFileId={activeFileId}
          // openFiles = {openFiles}
          language={language}
          code={code}
          onMount={onMount}
        />
        {/* No resizer handle needed here as output is fixed positioned */}
      </div>

      {/* Output Card - fixed positioned, so it doesn't affect layout flow */}
      <Output
        output={output}
        isError={isError}
        showOutput={showOutput}
        toggleTerminal={setShowOutput}
      />
      <CodeMate />

    </div>
  );
};

export default CodeEditor;
