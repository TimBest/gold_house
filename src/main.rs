#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

extern crate rocket;
extern crate rocket_contrib;
extern crate rustc_serialize;
extern crate hyper;
extern crate xmlJSON;

use rocket::response::content;
use rocket_contrib::Template;
use std::io::Read;
use std::str::FromStr;
use rustc_serialize::json;
use rustc_serialize::json::ToJson;
use hyper::Client;
use hyper::Url;
use xmlJSON::XmlDocument;

#[get("/api/v1/commodities")]
fn commodities() -> content::Json<&'static str> {
    content::Json("{ \"gold\": 22591738.036 }")
}

#[derive(FromForm)]
struct Location {
    address: String,
    postal_code: String
}

#[derive(RustcEncodable)]
struct ZillowJsonResponse {
  house_sqft: String,
  lot_sqft: String,
  price: String,
}

fn get_zillow_data(address: String, postal_code: String) -> ZillowJsonResponse {

    /* Request Home Data */
    let client = Client::new();
    let mut url = Url::parse("http://www.zillow.com/webservice/GetDeepSearchResults.htm").unwrap();
    url.set_query_from_pairs([
        ("address", address),
        ("citystatezip", postal_code),
        ("zws-id", "*****".to_string()),
    ].iter().cloned());
    let mut res = client.get(url).send().unwrap();

    // TODO: handle http failure cases
    let mut s = String::new();
    res.read_to_string(&mut s).unwrap();

    /* conver to JSON */
    let document : XmlDocument = XmlDocument::from_str(&s).unwrap();
    let jsn : json::Json = document.to_json();

    if let Some(finishedSqFt) = jsn.search("finishedSqFt") {
        if let Some(finished_sqft) = finishedSqFt.search("_") {
            if let Some(lotSizeSqFt) = jsn.search("lotSizeSqFt") {
                if let Some(lot_sqft) = lotSizeSqFt.search("_") {
                    if let Some(zestimate) = jsn.search("zestimate") {
                        if let Some(price) = zestimate.search("_") {
                            return ZillowJsonResponse {
                                house_sqft: str::replace(&format!("{}", finished_sqft), "\"", ""),
                                lot_sqft: str::replace(&format!("{}", lot_sqft), "\"", ""),
                                price: str::replace(&format!("{}", price), "\"", ""),
                            }
                        }
                    }
                }
            }
        }
    }

    return ZillowJsonResponse {
        house_sqft: "".to_string(),
        lot_sqft: "".to_string(),
        price: "".to_string(),
    }
}

#[get("/api/v1/zillow?<location>")]
fn zillow(location: Location) -> String {
    let response = get_zillow_data(location.address, location.postal_code);
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
