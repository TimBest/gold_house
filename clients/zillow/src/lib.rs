extern crate hyper;
extern crate serde_xml_rs;

#[macro_use]
extern crate serde_derive;

pub mod client {
    use std::io::Read;
    use hyper::Client;
    use hyper::Url;
    use serde_xml_rs::deserialize;

    #[derive(Serialize, Deserialize)]
    pub struct ZillowJsonResponse {
      house_sqft: String,
      lot_sqft: String,
      price: String,
    }

    #[derive(Debug, Deserialize)]
    pub struct Zestimate {
        amount: String,
    }

    #[derive(Debug, Deserialize)]
    pub struct House {
        lotSizeSqFt: String,
        finishedSqFt: String,
        zestimate: Zestimate,
    }

    #[derive(Debug, Deserialize)]
    pub struct ZillowResult {
        #[serde(rename = "result", default)]
        result: Vec<House>
    }

    #[derive(Debug, Deserialize)]
    pub struct ZillowResponse {
        results: ZillowResult
    }

    #[derive(Debug, Deserialize)]
    pub struct ZillowXMLResponse {
        response: ZillowResponse,
    }


    pub fn get_deep_search_results(address: String, postal_code: String, zws_id: String) -> ZillowJsonResponse {

        /* Request Home Data */
        let client = Client::new();
        let mut url = Url::parse("http://www.zillow.com/webservice/GetDeepSearchResults.htm").unwrap();
        url.set_query_from_pairs([
            ("address", address),
            ("citystatezip", postal_code),
            ("zws-id", zws_id),
        ].iter().cloned());
        let mut res = client.get(url).send().unwrap();

        // TODO: handle http failure cases
        let mut s = String::new();
        res.read_to_string(&mut s).unwrap();

        /* parse XML */
        let document: ZillowXMLResponse = deserialize(s.as_bytes()).unwrap();
        let house = document.response.results.result.iter().nth(0);

        match house {
            Some(house) => ZillowJsonResponse {
                house_sqft: format!("{}", house.lotSizeSqFt),
                lot_sqft: format!("{}", house.finishedSqFt),
                price: format!("{}", house.zestimate.amount),
            },
            None => ZillowJsonResponse {
                house_sqft: "".to_string(),
                lot_sqft: "".to_string(),
                price: "".to_string(),
            },
        }
    }
}
