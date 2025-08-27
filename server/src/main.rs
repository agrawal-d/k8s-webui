#[macro_use]
extern crate rocket;
use rocket::http::{Method, Status};
use rocket::serde::{Deserialize, Serialize, json::Json};
use rocket::{Build, Rocket};
use rocket_cors::{AllowedOrigins, CorsOptions};
use std::process::Command;

#[get("/")]
fn index() -> Status {
    Status::Ok
}

#[derive(Serialize)]
struct CommandResult {
    stdout: String,
    stderr: String,
    exit_code: i32,
}

#[derive(Deserialize)]
struct KubectlCommand {
    context: String,
    namespace: String,
    command: String,
}

#[post("/run-cmd", format = "json", data = "<cmd_input>")]
fn run_cmd(cmd_input: Json<KubectlCommand>) -> Json<CommandResult> {
    let kubectl_command = format!(
        "kubectl {} --namespace {} --context {}",
        cmd_input.command, cmd_input.namespace, cmd_input.context
    );

    let output = Command::new("sh")
        .arg("-c")
        .arg(&kubectl_command)
        .output()
        .expect("Failed to execute command");

    Json(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[get("/namespaces?<context>")]
fn get_namespaces(context: String) -> Json<Vec<String>> {
    let output = Command::new("kubectl")
        .arg("get")
        .arg("namespaces")
        .arg("--context")
        .arg(context)
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let namespaces: Vec<String> = stdout
        .lines()
        .skip(1)
        .map(|line| line.split_whitespace().next().unwrap().to_string())
        .collect();

    Json(namespaces)
}

#[get("/contexts")]
fn get_contexts() -> Json<Vec<String>> {
    let output = Command::new("kubectl")
        .arg("config")
        .arg("get-contexts")
        .arg("-o")
        .arg("name")
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let contexts: Vec<String> = stdout
        .lines()
        .map(|line| line.split_whitespace().next().unwrap().to_string())
        .collect();

    Json(contexts)
}

fn app() -> Rocket<Build> {
    let cors = CorsOptions::default()
        .allowed_origins(AllowedOrigins::all())
        .allowed_methods(
            vec![Method::Get, Method::Post, Method::Patch]
                .into_iter()
                .map(From::from)
                .collect(),
        )
        .allow_credentials(true);

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(6868);

    rocket::custom(rocket::Config {
        port,
        ..rocket::Config::default()
    })
    .mount("/", routes![index, run_cmd, get_namespaces, get_contexts])
    .attach(cors.to_cors().unwrap())
}

#[launch]
fn rocket() -> _ {
    app()
}
