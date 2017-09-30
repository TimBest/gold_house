from flask import Flask, request
from flask_cors import CORS
from flask_restful import Resource, Api

import zillow

app = Flask(__name__)
CORS(app) # TODO: Fix for prod
api = Api(app)
zillow_api = zillow.ValuationApi()

class Zillow(Resource):
    def get(self):
        data = zillow_api.GetDeepSearchResults(
            '***********',
            request.args['address'],
            request.args['postal_code']
        ).get_dict()
        return {
            "house_sqft": data['extended_data']['finished_sqft'],
            "lot_sqft": data['extended_data']['lot_size_sqft'],
            "price": data['zestimate']['amount'],
        }

class Commodities(Resource):
    def get(self):
        return {
            'gold': 22591738.036
        }

api.add_resource(Zillow, '/api/v1/address')
api.add_resource(Commodities, '/api/v1/commodities')

if __name__ == '__main__':
    app.run(debug=True)
