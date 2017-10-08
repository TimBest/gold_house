#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

extern crate rocket;
extern crate rocket_contrib;
extern crate rustc_serialize;
extern crate zillow;

use zillow::client;
use rocket::response::content;
use rocket_contrib::Template;
use rustc_serialize::json;


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
fn zillow(location: Location) -> String {
    let response = client::get_deep_search_results(
        location.address,
        location.postal_code,
        "****".to_string()
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
        .launch();
}
