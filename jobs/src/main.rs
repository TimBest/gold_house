use std::error::Error;
use std::io::prelude::*;
use std::fs::File;
use std::path::Path;

extern crate serde;
extern crate serde_json;
extern crate quandl;

#[macro_use]
extern crate serde_derive;
extern crate toml;

use quandl::client;
use quandl::client::StringFloat;

#[derive(Serialize, Deserialize)]
struct Commodities {
    gold: f64,
}

#[derive(Deserialize)]
struct ApiKeys {
    quandl: String,
}

fn api_keys() -> ApiKeys {
    let path = Path::new("api_keys.toml");
    let display = path.display();

    let mut file = match File::open("api_keys.toml") {
        Err(why) => panic!("couldn't open {}: {}",
                           display,
                           why.description()),
        Ok(file) => file,
    };
    let mut contents = String::new();
    file.read_to_string(&mut contents);

    toml::from_str(&contents).unwrap()
}

fn value_of_gold(quandl_api_key: String) -> f64 {
    let v = client::get_gold(quandl_api_key);
    let usd_per_troy_ounce: f64 = match v.dataset.data[0][1] {
        StringFloat::Date(ref s) => 0.0 as f64,
        StringFloat::Price(f) => f,
    };
    let troy_ounces_of_gold_in_one_cubic_foot = 17554.48;
    usd_per_troy_ounce * troy_ounces_of_gold_in_one_cubic_foot
}

fn save_commodities(commodities: Commodities) {
    let path = Path::new("../data/commodities.json");
    let display = path.display();

    // Open a file in write-only mode, returns `io::Result<File>`
    let mut file = match File::create(&path) {
        Err(why) => panic!("couldn't create {}: {}",
                           display,
                           why.description()),
        Ok(file) => file,
    };

    // Write the `LOREM_IPSUM` string to `file`, returns `io::Result<()>`
    match file.write_all(serde_json::to_string(&commodities).unwrap().as_bytes()) {
        Err(why) => {
            panic!("couldn't write to {}: {}", display,
                                               why.description())
        },
        Ok(_) => println!("successfully wrote to {}", display),
    };
}

fn main() {

    let api_keys = api_keys();

    let commodities = Commodities {
        gold: value_of_gold(api_keys.quandl)
    };

    save_commodities(commodities);
}
