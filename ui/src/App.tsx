import React, { useState, useEffect } from "react";
import { CommandData, CommandResult, HistoryItem, SelectData } from "./types";
import Select from "react-select";
import "./index.css";
import {
  get_contexts,
  get_namespaces,
  getKubectlCommand,
  run_command,
  SERVER,
} from "./remote";
import { get } from "http";
const INTERNAL_DOC_LINK =
  "https://docs.google.com/document/u/0/d/1ZDdvxu4KZQWEvcEki8Sfe9wg3gdepOj1X2m0EsgEsFw/edit?usp=sharing&pli=1&authuser=0";
const App = () => {
  const [command, setCommand] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedCommandId, setSelectedCommandId] = useState<number>(0);
  const [currentContext, setCurrentContext] = useState<string | null>(null);
  const [currentNamespace, setCurrentNamespace] = useState<string | null>(null);
  const [namespaces, setNamespace] = useState<SelectData>([]);
  const [contexts, setContexts] = useState<SelectData>([]);
  const [error, setError] = useState<string | null>(null);
  const [noContext, setNoContext] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setError(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    const stored = localStorage.getItem("history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (err) {
        setError("Failed to restore history: " + err);
      }
    }

    get_contexts().then((result) => {
      if (Array.isArray(result)) {
        setContexts(result.map((ctx) => ({ value: ctx, label: ctx })));
        setCurrentContext(result[0]);
      } else {
        setContexts([]);
        setNoContext(true);
      }
    });
  }, []);

  useEffect(() => {
    if (currentContext) {
      setNamespace([]);
      get_namespaces(currentContext).then((result) => {
        if (Array.isArray(result)) {
          setNamespace(result.map((ns) => ({ value: ns, label: ns })));
          setCurrentNamespace(result[0]);
        } else {
          setNamespace([]);
          setError(result.message);
        }
      });
    }
  }, [currentContext]);

  const storeHistory = (history: object) => {
    console.log("Storing history");
    try {
      localStorage.setItem("history", JSON.stringify(history));
    } catch (err) {
      console.error("Failed to save history to localStorage", err);
    }
  };

  const handlePillClick = (id: number) => {
    const data = history.find((cmd) => cmd.commandData.id === id);

    if (!data) {
      return;
    }

    setCommand(data.commandData.command);
    setCurrentContext(data.commandData.context);
    setCurrentNamespace(data.commandData.namespace);
    setSelectedCommandId(id);
    window.editor.setValue(data.output);
  };

  const truncateWithElipsis = (str: string, maxLength: number) => {
    if (str.length <= maxLength) {
      return str;
    }
    return str.slice(0, maxLength) + "...";
  };

  const renderHistoryPills = () => {
    if (!history.length) {
      return (
        <div className="no-history">
          Previously kubectl commands will appear here
        </div>
      );
    }

    let ret = [];
    for (let index = history.length - 1; index >= 0; index--) {
      const cmd = history[index].commandData;
      ret.push(
        <div
          onClick={() => handlePillClick(cmd.id)}
          key={cmd.id}
          className={`command-row ${
            selectedCommandId === cmd.id ? "command-row-selected" : ""
          }`}
        >
          <div title={cmd.command}>{truncateWithElipsis(cmd.command, 100)}</div>
          <span className="command-meta">
            {cmd.context}/{cmd.namespace}
          </span>
        </div>
      );
    }
    return ret;
  };

  const handleClear = () => {
    setHistory([]);
    setSelectedCommandId(0);
    try {
      localStorage.removeItem("history");
    } catch (err) {
      setError("Failed to clear history: " + err);
    }
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <div className="error">
        <span>{error}</span>
        <span className="close-error" onClick={() => setError(null)}>
          ×
        </span>
      </div>
    );
  };

  const updateOutput = (
    id: number,
    result: Error | CommandResult,
    kubectlCommand: string
  ) => {
    let formatted = kubectlCommand + "\n---\n";

    if (result instanceof Error) {
      formatted = result.message;
    } else {
      if (result.stderr) {
        formatted += `STDERR: ${result.stderr}\n`;
      }

      if (result.exit_code != 0) {
        formatted += `Exit Code: ${result.exit_code}\n`;
      }

      formatted += result.stdout;
    }

    setHistory((prev) => {
      const newHistory = prev.map((cmd) =>
        cmd.commandData.id === id ? { ...cmd, output: formatted } : cmd
      );
      storeHistory(newHistory);
      return newHistory;
    });

    window.editor.setValue(formatted);
  };

  const handleRunCommand = async () => {
    if (!currentContext || !currentNamespace) {
      setError("Please select both context and namespace");
      return;
    }

    const newCommand: CommandData = {
      id: Date.now(),
      command,
      context: currentContext,
      namespace: currentNamespace,
    };
    const output = `Running command ${getKubectlCommand(newCommand)}`;

    setHistory((prevHistory) => [
      ...prevHistory,
      { commandData: newCommand, output },
    ]);
    setSelectedCommandId(newCommand.id);
    setCommand("");
    window.editor.setValue(output);

    const result = await run_command(newCommand);
    updateOutput(newCommand.id, result, getKubectlCommand(newCommand));
  };

  const renderNoContext = () => {
    if (noContext) {
      return (
        <div className="backdrop">
          <div className="setup">
            <h1>k8s-webui</h1>
            <div className="intro">
              <p>
                A web-based interface for managing Kubernetes clusters To get
                started, follow these instructions:
              </p>
              <p className="internal-setup">
                Internal users follow{" "}
                <a
                  href={INTERNAL_DOC_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  these instructions
                </a>
              </p>
              <p>
                <span className="step">
                  Download and run the server in your VM
                </span>
                <pre>
                  wget
                  "https://github.com/agrawal-d/k8s-webui/releases/latest/download/k8s-webui-server"
                </pre>
                <pre>chmod +x ./k8s-webui-server</pre>
                <pre>./k8s-webui-server</pre>
                <span className="step">Reload this page</span>
                <p>
                  Next time, you don't need to download again. Just run the
                  server, port forward if needed, and launch the{" "}
                  <a href="#">web-app</a>.
                </p>
                <hr />
                <button
                  className="reload"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
                <hr />
                <div className="note-warning">
                  This message is being shown because the app could not connect
                  to the server {SERVER}
                </div>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="main">
      {renderError()}
      {renderNoContext()}
      <div className="history">
        <div className="history-header">
          <b>k8s-webui</b>
          <div className="clear-history-btn" onClick={() => handleClear()}>
            Clear
          </div>
        </div>
        <div className="past-commands">{renderHistoryPills()}</div>

        <div className="config">
          <Select
            options={contexts}
            placeholder="Context"
            menuPlacement="top"
            value={
              currentContext
                ? { value: currentContext, label: currentContext }
                : null
            }
            onChange={(selected) =>
              setCurrentContext(selected ? selected.value : null)
            }
            isLoading={!contexts.length}
          />
          <br />
          <Select
            options={namespaces}
            placeholder="Namespace"
            menuPlacement="top"
            value={
              currentNamespace
                ? { value: currentNamespace, label: currentNamespace }
                : null
            }
            onChange={(selected: any) =>
              setCurrentNamespace(selected ? selected.value : null)
            }
            isLoading={!namespaces.length}
          />
        </div>
      </div>
      <div className="current">
        <div id="output"></div>
        <input
          type="text"
          className="runner"
          value={command}
          placeholder="get pod -o wide -l app=nginx"
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleRunCommand();
            }
          }}
        />
      </div>
    </div>
  );
};

export default App;
