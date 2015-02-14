(function(EsriLeaflet) {

  EsriLeaflet.Layers.CachedBasemapLayer = EsriLeaflet.BasemapLayer.extend({
        _setUpTile: function(tile, value) {
            tile._layer = this;
            tile.onload = this._tileOnLoad;
            tile.onerror = this._tileOnError;
            tile.src = value;

            this.fire('tileloadstart', {
                tile: tile,
                url: tile.src
            });
        },
        //v0.8 functions:
        _getMapTopLeftPoint: function(center, zoom) {
            var pixelOrigin = center && zoom !== undefined ?
                this._getMapNewPixelOrigin(center, zoom) :
                this._map.getPixelOrigin();
            return pixelOrigin.subtract(this._map._getMapPanePos());
        },
        //v0.8 functions:
        _getMapPixelBounds: function(center, zoom) {

            var topLeftPoint = this._getMapTopLeftPoint(center, zoom);
            return new L.Bounds(topLeftPoint, topLeftPoint.add(this._map.getSize()));
        },
        _getMapNewPixelOrigin: function(center, zoom) {
            var viewHalf = this._map.getSize()._divideBy(2);
            // TODO round on display, not calculation to increase precision?
            return this._map.project(center, zoom)._subtract(viewHalf)._add(this._map._getMapPanePos())._round();
        },
        _pxBoundsToTileRange: function(bounds) {

            //
            var result = new L.Bounds(
                bounds.min.divideBy(this._getTileSize()).floor(),
                bounds.max.divideBy(this._getTileSize()).floor());

            return result;
        },



        preload: function(center, min_zoom, max_zoom, progress, done) {
            var self = this;
            var center = center || self._map.getCenter();
            min_zoom = min_zoom || Math.round(self._map.getZoom());
            max_zoom = max_zoom || self.options.maxZoom;




            var total = 0
            var loaded = 0;

            function _progress() {
                loaded++;
                progress(loaded, total);
                if (total <= loaded) {
                    done()
                }
            }

            for (var z = min_zoom; z <= max_zoom; z++) {
                //get the pixel bounds of the map
                //

                var pixelBounds = self._getMapPixelBounds(center, z);


                //convert to tile points
                var tileRange = self._pxBoundsToTileRange(pixelBounds);

                for (var j = tileRange.min.y; j <= tileRange.max.y; j++) {

                    for (var i = tileRange.min.x; i <= tileRange.max.x; i++) {
                        total++;
                        //
                        var coords = new L.Point(i, j);
                        coords.z = z;

                        self._preloadTile(coords, _progress);
                    }
                }
            }
        },

        _preloadTile: function(tilePoint, _progress) {
            var self = this;
            var key = tilePoint.z + ',' + tilePoint.x + ',' + tilePoint.y;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', self.getTileUrl(tilePoint), true);
            xhr.responseType = 'blob';

            xhr.onload = function(e) {
                if (this.status == 200) {
                    var reader = new FileReader();
                    reader.onloadend = function(e) {

                        self.options.storage.put({
                            _id: key,
                            v: e.target.result
                        });
                        _progress();
                    };
                    reader.readAsDataURL(this.response);
                }

            };
            xhr.send();
        },

        _loadTile: function(tile, tilePoint) {
            this._adjustTilePoint(tilePoint);
            //
            var key = tilePoint.z + ',' + tilePoint.x + ',' + tilePoint.y;
            var self = this;
            if (this.options.storage) {
                this.options.storage.get(key, function(err, value) {

                    if (value) {

                        self._setUpTile(tile, value.v);
                    } else {

                        self._setUpTile(tile, self.getTileUrl(tilePoint));
                    }
                });
            } else {
                self._setUpTile(tile, self.getTileUrl(tilePoint));
            }
        }
    });

    EsriLeaflet.CachedBasemapLayer = EsriLeaflet.Layers.CachedBasemapLayer;

    EsriLeaflet.Layers.cachedBasemapLayer = function(key, options) {
        return new EsriLeaflet.Layers.CachedBasemapLayer(key, options);
    };

    EsriLeaflet.cachedBasemapLayer = function(key, options) {
        return new EsriLeaflet.Layers.CachedBasemapLayer(key, options);
    };

})(L.esri);
