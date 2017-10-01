extern crate iron;
extern crate router;
extern crate rustc_serialize;
extern crate urlencoded;
extern crate hyper;
extern crate xmlJSON;
extern crate serde_json;
extern crate iron_cors;

use iron::prelude::*;
use iron::status;
use iron::mime::Mime;
use router::Router;
use rustc_serialize::json;
use rustc_serialize::json::ToJson;
use urlencoded::UrlEncodedQuery;
use hyper::Client;
use hyper::Url;
use std::io::Read;
use xmlJSON::XmlDocument;
use std::str::FromStr;
use serde_json::{Value, Error};
use iron_cors::CorsMiddleware;

#[derive(RustcEncodable)]
struct CommoditiesJsonResponse {
  gold: f32
}

#[derive(RustcEncodable)]
struct ZillowJsonResponse {
  house_sqft: String,
  lot_sqft: String,
  price: String,

}

#[derive(RustcEncodable)]
struct ErrorJsonResponse {
  error: String,
}

fn commodities_handler(_request: &mut Request) -> IronResult<Response> {
    let response = CommoditiesJsonResponse { gold: 22591738.036 };
    let out = json::encode(&response).unwrap();

    let content_type = "application/json".parse::<Mime>().unwrap();
    Ok(Response::with((content_type, status::Ok, out)))
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

fn zillow_handler(request: &mut Request) -> IronResult<Response> {
    let content_type = "application/json".parse::<Mime>().unwrap();

    let query = request.get_ref::<UrlEncodedQuery>().unwrap();
    if let Some(address_param) = query.get("address") {
        if let Some(postal_code_param) = query.get("postal_code") {
            let address = format!("{}", &address_param[0]);
            let postal_code = format!("{}", &postal_code_param[0]);
            let response = get_zillow_data(address, postal_code);
            let out = json::encode(&response).unwrap();
            return Ok(Response::with((content_type, status::Ok, out)))
        }
    }
    let response = ErrorJsonResponse {
        error: "Specify address and postal_code query params".to_string(),
    };
    let out = json::encode(&response).unwrap();
    Ok(Response::with((content_type, status::BadRequest, out)))
}

fn main() {
    let cors_middleware = CorsMiddleware::with_allow_any(true);
    let mut router = Router::new();           // Alternative syntax:
    router.get("/api/v1/address", zillow_handler, "address");
    router.get("/api/v1/commodities", commodities_handler, "commodities");

    let mut chain = Chain::new(router);
    chain.link_around(cors_middleware);

    Iron::new(chain).http("localhost:5000").unwrap();
}
