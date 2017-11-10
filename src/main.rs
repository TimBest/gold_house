#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

extern crate rocket;
extern crate rocket_contrib;
extern crate rustc_serialize;
extern crate zillow;

use rocket::fairing::AdHoc;
use rocket::response::content;
use rocket::State;
use rocket_contrib::Template;
use rustc_serialize::json;
use zillow::client;

struct ApiKeys {
    zillow: String
}

#[get("/api/v1/commodities")]
fn commodities() -> content::Json<&'static str> {
    content::Json("{ \"gold\": 22591738.036 }")
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
    let out = json::encode(&response).unwrap();
    return out
}

#[get("/")]
fn index() -> Template {
    Template::render("index", {})
}

fn main() {
    rocket::ignite()
        .mount("/", routes![index, commodities, zillow])
        .attach(Template::fairing())
        .attach(AdHoc::on_attach(|rocket| {
            println!("Adding token managed state from config...");
            let zillow_api_key = rocket.config().get_str("zillow_api_key").unwrap_or("").to_string();
            Ok(rocket.manage(ApiKeys { zillow: zillow_api_key }))
        }))
        .launch();
}
