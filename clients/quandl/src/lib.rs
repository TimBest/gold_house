extern crate hyper;
extern crate serde_json;

#[macro_use]
extern crate serde_derive;

pub mod client {
    use std::io::Read;
    use hyper::Client;
    use hyper::Url;
    use serde_json::Error;
    use serde_json;

    #[derive(Serialize, Deserialize)]
    #[serde(untagged)]
    pub enum StringFloat {
        Date(String),
        Price(f64),
    }

    #[derive(Serialize, Deserialize)]
    pub struct Dataset {
        pub dataset_code: String,
        pub data: Vec<Vec<StringFloat>>,
    }

    #[derive(Serialize, Deserialize)]
    pub struct Response {
        pub dataset: Dataset,
    }

    pub fn get_gold(api_key: String) -> Response {
        /* Request Home Data */
        let client = Client::new();
        let mut url = Url::parse("https://www.quandl.com/api/v3/datasets/LBMA/GOLD.json").unwrap();
        url.set_query_from_pairs([
            ("rows", "1".to_string()),
            ("api_key", api_key),
        ].iter().cloned());
        let mut res = client.get(url).send().unwrap();

        // TODO: handle http failure cases
        let mut s = String::new();
        res.read_to_string(&mut s).unwrap();

        // let s = stringify!({"dataset":{"id":11304240,"dataset_code":"2017-10-06","database_code":"LBMA","name":"Gold Price: London Fixing","description":"Gold Price: London Fixings, London Bullion Market Association (LBMA). Fixing levels are set per troy ounce.\nThe London Gold Fixing Companies set the prices for gold that are globally considered as the international standard for pricing of gold.\nThe Gold price in London is set twice a day by five LBMA Market Makers who comprise the London Gold Market Fixing Limited (LGMFL).\nThe process starts with the announcement from the Chairman of the LGMFL to the other members of the LBMA Market Makers, then relayed to the dealing rooms where customers can express their interest as buyers or sellers and also the quantity they wish to trade. The gold fixing price is then set by collating bids and offers until the supply and demand are matched. At this point the price is announced as the 'Fixed' price for gold and all business is conducted on the basis of that price.","refreshed_at":"2017-10-06T16:50:18.145Z","newest_available_date":"2017-10-06","oldest_available_date":"1968-01-02","column_names":["Date","USD (AM)","USD (PM)","GBP (AM)","GBP (PM)","EURO (AM)","EURO (PM)"],"frequency":"daily","type":"Time Series","premium":false,"limit":1,"transform":null,"column_index":null,"start_date":"1968-01-02","end_date":"2017-10-06","data":[["2017-10-06",1268.2,1261.8,970.43,967.93,1083.93,1078.59]],"collapse":null,"order":null,"database_id":139}});

        return serde_json::from_str(&s).unwrap();
    }
}
