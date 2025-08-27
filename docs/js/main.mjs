const SERVER = "http://127.0.0.1:6868"
const contextSelect = document.getElementById("contexts");
const namespaceSelect = document.getElementById("namespaces");
const commandInput = document.getElementById("command");
const initialText = `Kubernetes Web UI.
Select a context, namespace, and type a command to get started.`
const pastCommandsDiv = document.getElementById("past_commands");

async function get_contexts() {
    try {
        const response = await fetch(`${SERVER}/contexts`);
        const contexts = await response.json();
        return contexts;
    }
    catch (err) {
        showServerErrorDialog(err);
        throw err;
    }
}

async function get_namespaces(context) {
    try {
        const response = await fetch(`${SERVER}/namespaces?context=${context}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const namespaces = await response.json();
        return namespaces;
    } catch (err) {
        showServerErrorDialog(err);
        throw err;
    }
}

function showServerErrorDialog(error) {
    const dialog = document.getElementById("server-error-dialog");
    const msg = dialog.querySelector(".server-error-dialog-msg");
    msg.innerHTML = `Could not connect to the backend server.<br><br><b>The server must be running for the web UI to work.</b><br><br>Error details:<br><pre style='text-align:left;white-space:pre-wrap;background:#f8f8f8;padding:0.5em;border-radius:4px;'>${error}</pre>`;
    dialog.style.display = "flex";
    dialog.querySelector(".server-error-close-btn").onclick = () => {
        dialog.style.display = "none";
    };
}

function get_selected_context() {
    return choicesContext.getValue(true);
}

function get_selected_namespace() {
    return choicesNamespace.getValue(true);
}

function update_editor(command, context, namespace, data) {
    let extraText = ""
    if (data.stderr && data.stderr.trim() !== "") {
        extraText += `STDERR:
${data.stderr}
`;
    }

    if (data.exit_code != 0) {
        extraText += `Exit code: ${data.exit_code}`;
    }

    window.editor.setValue(`kubectl ${command} --context ${context} --namespace ${namespace}
-------
${data.stdout}
-------
${extraText}
`);
}

function createCommandRow(command, context, namespace, data) {
    const commandObj = { command, context, namespace, data };
    return `<div class="command-row" onclick="handleHistorySelect(event)" data='${JSON.stringify(commandObj)}'>${command} <div class="config-pill">ctx ${context} | ns ${namespace}</div></div>`;
}

function handle_cmd_response(command, context, namespace, data) {
    update_editor(command, context, namespace, data);
    const commandRow = createCommandRow(command, context, namespace, data);
    pastCommandsDiv.insertAdjacentHTML("afterbegin", commandRow);


    // Save to localStorage
    let history = JSON.parse(localStorage.getItem("commandHistory") || "[]");
    history.unshift({ command, context, namespace, data });
    // Limit history to 50 entries
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem("commandHistory", JSON.stringify(history));
}

function handleHistorySelect(event) {
    console.log(event);
    const { command, context, namespace, data } = JSON.parse(event.currentTarget.getAttribute("data"));
    update_editor(command, context, namespace, data);
    commandInput.value = command;
}

commandInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        const command = commandInput.value;
        const context = get_selected_context();
        const namespace = get_selected_namespace();

        fetch(`${SERVER}/run-cmd`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ context, namespace, command })
        })
            .then(response => response.json())
            .then(data => {
                handle_cmd_response(command, context, namespace, data);
            });
    }
});

document.addEventListener("DOMContentLoaded", async function () {
    window.choicesContext = new Choices(contextSelect);
    window.choicesNamespace = new Choices(namespaceSelect);

    // Load history from localStorage
    let history = JSON.parse(localStorage.getItem("commandHistory") || "[]");
    for (const entry of history) {
        const commandRow = createCommandRow(entry.command, entry.context, entry.namespace, entry.data);
        pastCommandsDiv.insertAdjacentHTML("beforeend", commandRow);
    }

    const contexts = await get_contexts();
    choicesContext.setChoices(contexts.map((c, index) => ({ value: c, label: c, selected: index === 0 })), 'value', 'label', true, replaceChoices = true);

    await load_namespaces();

    // Add clear history button functionality
    const clearBtn = document.getElementById("clear_history_btn");
    if (clearBtn) {
        clearBtn.addEventListener("click", function () {
            localStorage.removeItem("commandHistory");
            pastCommandsDiv.innerHTML = "";
        });
    }
});

async function load_namespaces() {
    const selectedContext = get_selected_context();

    const namespaces = await get_namespaces(selectedContext);
    console.log("Selected context:", selectedContext, "Loaded namespaces", namespaces);
    choicesNamespace.setChoices(namespaces.map((n, index) => ({ value: n, label: n, selected: index === 0 })), 'value', 'label', true, replaceChoices = true);
}

contextSelect.addEventListener("change", async function (e) {
    await load_namespaces();
});


require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.48.0/min/vs' } });
require(["vs/editor/editor.main"], function () {
    window.editor = monaco.editor.create(document.getElementById('output'), {
        value: initialText,
        language: "ini",
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        automaticLayout: true,
    });

    console.log("Done")
});