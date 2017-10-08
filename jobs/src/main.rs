use std::error::Error;
use std::io::prelude::*;
use std::fs::File;
use std::path::Path;

extern crate quandl;

use quandl::client;
use quandl::client::StringFloat;

fn main() {
    let v = client::get_gold("****".to_string());
    let usd_per_troy_ounce: f64 = match v.dataset.data[0][1] {
        StringFloat::String(ref s) => 0 as f64,
        StringFloat::Float(f) => f,
    };
    let troy_ounces_of_gold_in_one_cubic_foot = 17554.48;
    let gold = usd_per_troy_ounce * troy_ounces_of_gold_in_one_cubic_foot;
    println!("{}", gold);
    // let path = Path::new("commodities.txt");
    // let display = path.display();
    //
    // // Open a file in write-only mode, returns `io::Result<File>`
    // let mut file = match File::create(&path) {
    //     Err(why) => panic!("couldn't create {}: {}",
    //                        display,
    //                        why.description()),
    //     Ok(file) => file,
    // };
    //
    // // Write the `LOREM_IPSUM` string to `file`, returns `io::Result<()>`
    // match file.write_all(LOREM_IPSUM.as_bytes()) {
    //     Err(why) => {
    //         panic!("couldn't write to {}: {}", display,
    //                                            why.description())
    //     },
    //     Ok(_) => println!("successfully wrote to {}", display),
    // }
}
