import { Component, OnInit, ViewChild } from '@angular/core';
import { IonModal } from '@ionic/angular';

const mapboxgl = require('mapbox-gl');
// Private token
// const access_token = 'pk.eyJ1IjoiY21lZGlhbGlua3MiLCJhIjoiY2xkb3EyNzloMDE5eDNvcGIzamYwODNmMiJ9.DG_9OmSau77jkazt3dnYLg';

// Public token
const access_token = 'pk.eyJ1IjoiY21lZGlhbGlua3MiLCJhIjoiY2xkb3BxZTFtMHYzdTNwbjBhN2NrOGI1ZSJ9.L67JzDSl2zWqApX69QgZhA';

const startPosition = {
  long: 0,
  lat: 0
}

const endPosition = startPosition;

@Component({
  selector: 'app-routes',
  templateUrl: './routes.page.html',
  styleUrls: ['./routes.page.scss'],
})
export class RoutesPage implements OnInit {
  @ViewChild("stepsModal")
  stepsModal!: IonModal; //Steps modal 
  openModal: boolean = false; //Steps modal visible status
  map: any; // Map reference
  mode: string = "driving"; // Mode ie., driving || cycling || walking
  route: number = 1; // Current route 
  routeLoaded: boolean = false; // Route loaded status
  distance: string = ""; // Distance between routes
  duration: string = ""; // Travel duration
  steps: Array<any> = []; // Instruction steps
  routeData: any; // Loaded route data

  constructor() { }

  ngOnInit() {

  }

  ionViewDidEnter() {
    this.loadMap();
  }

  loadMap() {
    mapboxgl.accessToken = access_token;
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-0.10153989181986844, 51.497635790108916], // starting position
      zoom: 14
    });
    // set the bounds of the map
    // const bounds = [
    //   [-123.069003, 45.395273],
    //   [-122.303707, 45.612333]
    // ];
    // this.map.setMaxBounds(bounds);

    // an arbitrary start will always be the same
    // only the end or destination will change
    startPosition.long = -0.10153989181986844;
    startPosition.lat = 51.497635790108916;

    // this is where the code for the next step will go

    this.map.on('load', () => {
      // make an initial directions request that
      // starts and ends at the same location
      //  this.getRoute(this.start);

      // Add starting point to the map
      this.map.addLayer({
        id: 'point',
        type: 'circle',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Point',
                  coordinates: [startPosition.long, startPosition.lat]
                }
              }
            ]
          }
        },
        paint: {
          'circle-radius': 5,
          'circle-color': '#3880ff',
          'circle-stroke-color': 'white',
          'circle-stroke-width': 2,
        }
      });
      // this is where the code from the next step will go
    });

    this.map.on('click', (event: { lngLat: { [x: string]: any; }; }) => {
      this.route = 1;
      const coords = Object.keys(event.lngLat).map((key) => event.lngLat[key]);
      endPosition.long = coords[0];
      endPosition.lat = coords[1];
      const end = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: coords
            }
          }
        ]
      };
      if (this.map.getLayer('end')) {
        this.map.getSource('end').setData(end);
      } else {
        this.map.addLayer({
          id: 'end',
          type: 'circle',
          source: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'Point',
                    coordinates: coords
                  }
                }
              ]
            }
          },
          paint: {
            'circle-radius': 5,
            'circle-color': '#3880ff',
            'circle-stroke-color': 'white',
            'circle-stroke-width': 2,

          }
        });
      }
      this.getRoute(endPosition);
    });
  }

  async getRoute(endPosition: any) {
    // make a directions request using cycling profile
    // an arbitrary start will always be the same
    // only the end or destination will change
    mapboxgl.accessToken = access_token;

    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${this.mode}/${startPosition.long},${startPosition.lat};${endPosition.long},${endPosition.lat}?steps=true&alternatives=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
      { method: 'GET' }
    );
    this.routeData = await query.json();
    this.drawRoute();
  }

  drawRoute() {
    let r = this.route == 1 ? this.routeData.routes[0].geometry.coordinates : this.routeData.routes[1].geometry.coordinates;
    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: r
      }
    };
    // if the route already exists on the map, we'll reset it using setData
    if (this.map.getSource('route')) {
      this.map.getSource('route').setData(geojson);
    }
    // otherwise, we'll make a new request
    else {
      this.map.addLayer({
        id: 'route',
        type: 'line',
        source: {
          type: 'geojson',
          data: geojson
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3880ff',
          'line-width': 3,
          'line-opacity': 0.75
        }
      });
    }

    if (this.route == 1) {
      this.steps = this.routeData.routes[0].legs[0].steps;
      this.duration = this.secondsToHms(this.routeData.routes[0].duration);
      this.distance = this.formatDistance(this.routeData.routes[0].distance);
    }
    else {
      this.steps = this.routeData.routes[1].legs[0].steps;
      this.duration = this.secondsToHms(this.routeData.routes[1].duration);
      this.distance = this.formatDistance(this.routeData.routes[1].distance);
    }

    this.routeLoaded = true;
  }

  secondsToHms(d: number) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (" h, ") : "";
    var mDisplay = m > 0 ? m + (" m, ") : "";
    var sDisplay = s > 0 ? s + (" s") : "";
    return hDisplay + mDisplay + sDisplay;
  }

  formatDistance(distance: number) {
    return (distance / 1000).toFixed(2) + " km";
  }

  changeMode(m: string) {
    this.route = 1;
    this.mode = m;
    this.getRoute(endPosition);
  }

  changeRoute(r: number) {
    this.route = r;

    this.drawRoute();
  }

  openSteps() {
    this.openModal = true;

    this.stepsModal.onWillDismiss().then(() => {
      this.openModal = false;
    });
  }
}
