#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

extern crate rocket;
extern crate rocket_contrib;
extern crate serde;
extern crate serde_json;
extern crate zillow;

use rocket::fairing::AdHoc;
use rocket::response::NamedFile;
use rocket::response::status::NotFound;
use rocket::State;
use rocket_contrib::Template;
use std::path::{Path, PathBuf};
use zillow::client;

struct ApiKeys {
    zillow: String
}

#[get("/api/v1/commodities")]
fn commodities() -> Result<NamedFile, NotFound<String>> {
    let path = Path::new("data/commodities.json");
    NamedFile::open(&path).map_err(|_| NotFound(format!("Bad path: {}", path.display())))
}

#[derive(FromForm)]
struct Location {
    address: String,
    postal_code: String
}

#[get("/api/v1/zillow?<location>")]
fn zillow(location: Location, api_keys: State<ApiKeys>) -> String {
    let zillow_api_key = format!("{}", api_keys.zillow);
    let response = client::get_deep_search_results(
        location.address,
        location.postal_code,
        zillow_api_key
    );
    let out = serde_json::to_string(&response).unwrap();
    return out
}

#[get("/static/<file..>")]
fn files(file: PathBuf) -> Option<NamedFile> {
    NamedFile::open(Path::new("static/").join(file)).ok()
}

#[get("/")]
fn index() -> Template {
    Template::render("index", {})
}

fn main() {
    rocket::ignite()
        .mount("/", routes![index, files, commodities, zillow])
        .attach(Template::fairing())
        .attach(AdHoc::on_attach(|rocket| {
            let zillow_api_key = rocket.config().get_str("zillow_api_key").unwrap_or("").to_string();
            Ok(rocket.manage(ApiKeys { zillow: zillow_api_key }))
        }))
        .launch();
}
