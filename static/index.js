var url = 'http://localhost:5000';

serialize = function(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
    }
  return str.join('&');
};

function status(response) {
  json = response.json();
  if (!response.ok) {
    return json.then(Promise.reject.bind(Promise));
  }
  return json;
}

function errorFn(response) {
  console.error('Something bad happened!');
  console.error(response);
}

/* API calls */
function getHouse(params, successFn) {
  fetch(url + '/api/v1/address?' + serialize(params), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  }).then(status).then(successFn).catch(errorFn);
};

function getGold(params, successFn) {
  fetch(url + '/api/v1/commodities' + serialize(params), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  }).then(status).then(successFn).catch(errorFn);
};

document.getElementById("calculate").addEventListener("click", function() {
  var address = document.getElementById("address").value;
  var postal_code = document.getElementById("postal_code").value;
  params = {
    address: address,
    postal_code: postal_code,
  }
  var house_price_per_sqft;
  var lot_price_per_sqft;
  var gold_price_per_cubic_foot;
  getHouse(params, function(response) {
    house_price_per_sqft = response.price / response.house_sqft;
    lot_price_per_sqft = response.price / response.lot_sqft;
    getGold({}, function(response) {
      gold_price_per_cubic_foot = response.gold;
      document.getElementById("houseGold").innerHTML = house_price_per_sqft / gold_price_per_cubic_foot
      document.getElementById("lotGold").innerHTML = lot_price_per_sqft / gold_price_per_cubic_foot
    })
  })
});
