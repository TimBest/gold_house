import quandl

# quandl.ApiConfig.api_key = "*************"

def price_of_gold_per_cubic_foot():
    data = quandl.get(
        "LBMA/GOLD",
        rows=1,
        authtoken="*************"
    ).to_dict()
    usd_per_troy_ounce = data['USD (AM)'].values()[0]
    troy_ounces_of_gold_in_one_cubic_foot = 17554.48
    return usd_per_troy_ounce * troy_ounces_of_gold_in_one_cubic_foot

commodities = {
    'gold': price_of_gold_per_cubic_foot(),
}

print commodities
