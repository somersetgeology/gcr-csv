L.TileLayer.BetterWMS = L.TileLayer.WMS.extend({
  
  onAdd: function (map) {
    // Triggered when the layer is added to a map.
    //   Register a click listener, then do all the upstream WMS things
    L.TileLayer.WMS.prototype.onAdd.call(this, map);
    map.on('click', this.getFeatureInfo, this);
  },
  
  onRemove: function (map) {
    // Triggered when the layer is removed from a map.
    //   Unregister a click listener, then do all the upstream WMS things
    L.TileLayer.WMS.prototype.onRemove.call(this, map);
    map.off('click', this.getFeatureInfo, this);
  },
  
  getFeatureInfo: function (evt) {
  if ((this._map.getZoom() >= this.options.minZoom) && (this._map.getZoom() <= this.options.maxZoom)) {
    // Make an AJAX request to the server and hope for the best
    var url = this.getFeatureInfoUrl(evt.latlng),
        showResults = L.Util.bind(this.showGetFeatureInfo, this);
    $.ajax({
      url: url,
      success: function (data, status, xhr) {
        var err = typeof data === 'string' ? null : data;
        //Fix for blank popup window
        var doc = (new DOMParser()).parseFromString(data, "text/html"); 
        if (doc.body.innerHTML.trim().length > 0)
          showResults(err, evt.latlng, data);
      },
      error: function (xhr, status, error) {
        //showResults(error);  
      }
    });
   }
  },
  
  getFeatureInfoUrl: function (latlng) {
    // Construct a GetFeatureInfo request URL given a point
    var point = this._map.latLngToContainerPoint(latlng, this._map.getZoom()),
        size = this._map.getSize(),
        
        params = {
          request: 'GetFeatureInfo',
          service: 'WMS',
          srs: 'EPSG:4326',
          styles: this.wmsParams.styles,
          transparent: this.wmsParams.transparent,
          version: this.wmsParams.version,      
          format: this.wmsParams.format,
          bbox: this._map.getBounds().toBBoxString(),
          height: size.y,
          width: size.x,
          layers: this.wmsParams.layers,
          query_layers: this.wmsParams.layers,
          info_format: 'text/plain'
        };
        
    params[params.version === '1.3.0' ? 'i' : 'x'] = point.x;
    params[params.version === '1.3.0' ? 'j' : 'y'] = point.y;
    
    return this._url + L.Util.getParamString(params, this._url, true);
  },
  
  showGetFeatureInfo: function (err, latlng, content) {
    if (err) { console.log(err); return; } // do nothing if there's an error
    var lng = latlng.lng;
    var lat = latlng.lat;
    var bngproj = '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs';
    var bngcoords = proj4(bngproj, [lng, lat]);
    var bngEasting = bngcoords[0].toFixed(0);
    var bngNorthing = bngcoords[1].toFixed(0);
        // get the 100km-grid indices
        var e100k = Math.floor(bngEasting/100000);
        var n100k = Math.floor(bngNorthing/100000);

        // validate BNG
        if (e100k<0 || e100k>6 || n100k<0 || n100k>12) {
		    var bngEasting = "";
            var bngNorthing = "";	
            var bngString = "";
            var eastingPrefix = "";
            var northingPrefix = "";
            var bngPrefix = "";
            
		} else {	
            // translate those into numeric equivalents of the grid letters
            var l1 = (19-n100k) - (19-n100k)%5 + Math.floor((e100k+10)/5);
            var l2 = (19-n100k)*5%25 + e100k%5;
            // compensate for skipped 'I' and build grid letter-pairs
            if (l1 > 7) l1++;
            if (l2 > 7) l2++;
            var letterPair = String.fromCharCode(l1+'A'.charCodeAt(0), l2+'A'.charCodeAt(0));
            // add leading 0s if necessary
            var osEasting = "0000" + bngEasting;
            var osNorthing = "0000" + bngNorthing;       
            var bngString = letterPair + " " + osEasting.substr(-5) + " " + osNorthing.substr(-5);
            var eastingPrefix = "  Easting:";
            var northingPrefix = " Northing:";
            var bngPrefix = "BNG:";
        }  
    blscontent = '';
    bls = content.split('GBR_BGS_625k_BLS');
    if (bls.length > 1) {
		blsname = bls[1].split("LEX_D = \'")[1];
		blsname = blsname.split("\'")[0];
		if (blsname != '') {blsname = 'Bedrock: ' + blsname};
		blsdesc = bls[1].split("RCS_D = \'")[1];
		blsdesc = blsdesc.split("\'")[0];
		if (blsdesc != '') {blsdesc = '<br/>Description: ' + blsdesc};
		blstime1 = bls[1].split("MAX_TIME_Y = \'")[1];
		blstime1 = blstime1.split("\'")[0];
		blstime1 = blstime1 / 1000000;
		blstime2 = bls[1].split("MIN_TIME_Y = \'")[1];
		blstime2 = blstime2.split("\'")[0];
		blstime2 = blstime2 / 1000000;
		blstime = '<br/>Time: ' + blstime1 + ' to ' + blstime2 + ' million years ago';
		blsage1 = bls[1].split("MAX_TIME_D = \'")[1];
		blsage1 = blsage1.split("\'")[0];
		blsage2 = bls[1].split("MIN_TIME_D = \'")[1];
		blsage2 = blsage2.split("\'")[0];
		if (blsage1 == blsage2) {blsage = blsage1} else {blsage = blsage1 + ' to ' + blsage2};
		if (blsage != '') {blsage = '<br/>Age: ' + blsage};
		blsepoch1 = bls[1].split("MAX_EPOCH = \'")[1];
		blsepoch1 = blsepoch1.split("\'")[0];
		blsepoch2 = bls[1].split("MIN_EPOCH = \'")[1];
		blsepoch2 = blsepoch2.split("\'")[0];
		if (blsepoch1 == blsepoch2) {blsepoch = blsepoch1} else {blsepoch = blsepoch1 + ' to ' + blsepoch2};
		if (blsepoch != '') {blsepoch = '<br/>Epoch: ' + blsepoch};
		blssubperiod1 = bls[1].split("MAX_SUBPER = \'")[1];
		blssubperiod1 = blssubperiod1.split("\'")[0];
		blssubperiod2 = bls[1].split("MIN_SUBPER = \'")[1];
		blssubperiod2 = blssubperiod2.split("\'")[0];
		if (blssubperiod1 == blssubperiod2) {blssubperiod = blssubperiod1} else {blssubperiod = blssubperiod1 + ' to ' + blssubperiod2};
		if (blssubperiod != '') {blssubperiod = '<br/>Subperiod: ' + blssubperiod};
		blsperiod1 = bls[1].split("MAX_PERIOD = \'")[1];
		blsperiod1 = blsperiod1.split("\'")[0];
		blsperiod2 = bls[1].split("MIN_PERIOD = \'")[1];
		blsperiod2 = blsperiod2.split("\'")[0];
		if (blsperiod1 == blsperiod2) {blsperiod = blsperiod1} else {blsperiod = blsperiod1 + ' to ' + blsperiod2};
		if (blsperiod != '') {blsperiod = '<br/>Period: ' + blsperiod};
		blsera1 = bls[1].split("MAX_ERA = \'")[1];
		blsera1 = blsera1.split("\'")[0];
		blsera2 = bls[1].split("MIN_ERA = \'")[1];
		blsera2 = blsera2.split("\'")[0];
		if (blsera1 == blsera2) {blsera = blsera1} else {blsera = blsera1 + ' to ' + blsera2};
		if (blsera != '') {blsera = '<br/>Era: ' + blsera};
		blseon1 = bls[1].split("MAX_EON = \'")[1];
		blseon1 = blseon1.split("\'")[0];
		blseon2 = bls[1].split("MIN_EON = \'")[1];
		blseon2 = blseon2.split("\'")[0];
		if (blseon1 == blseon2) {blseon = blseon1} else {blseon = blseon1 + ' to ' + blseon2};
		if (blseon != '') {blseon = '<br/>Eon: ' + blseon};
	    blscontent = blsname + blsdesc + blstime + blsage + blsepoch + blssubperiod + blsperiod + blsera + blseon + '<br/><br/>Locaton: ' + bngString + '<br/>';
    };

    slscontent = '';
    sls = content.split('GBR_BGS_625k_SLS');
    if (sls.length > 1) {
		slsname = sls[1].split(" = \'")[3];
		slsname = slsname.split("\'")[0];
		slsdesc = sls[1].split(" = \'")[5];
		slsdesc = slsdesc.split("\'")[0];
		slsage1 = sls[1].split("MAX_TIME_D = \'")[1];
		slsage1 = slsage1.split("\'")[0];
		slsage2 = sls[1].split("MIN_TIME_D = \'")[1];
		slsage2 = slsage2.split("\'")[0];
		if (slsage1 == blsage2) {slsage = slsage1} else {slsage = slsage1 + ' to ' + slsage2};
		slsepoch1 = sls[1].split("MAX_EPOCH = \'")[1];
		slsepoch1 = slsepoch1.split("\'")[0];
		slsepoch2 = sls[1].split("MIN_EPOCH = \'")[1];
		slsepoch2 = slsepoch2.split("\'")[0];
		if (slsepoch1 == slsepoch2) {slsepoch = slsepoch1} else {slsepoch = slsepoch1 + ' to ' + slsepoch2};
		slssubperiod1 = sls[1].split("MAX_SUBPER = \'")[1];
		slssubperiod1 = slssubperiod1.split("\'")[0];
		slssubperiod2 = sls[1].split("MIN_SUBPER = \'")[1];
		slssubperiod2 = slssubperiod2.split("\'")[0];
		if (slssubperiod1 == slssubperiod2) {slssubperiod = slssubperiod1} else {slssubperiod = slssubperiod1 + ' to ' + slssubperiod2};
		slsperiod1 = sls[1].split("MAX_PERIOD = \'")[1];
		slsperiod1 = slsperiod1.split("\'")[0];
		slsperiod2 = sls[1].split("MIN_PERIOD = \'")[1];
		slsperiod2 = slsperiod2.split("\'")[0];
		if (slsperiod1 == slsperiod2) {slsperiod = slsperiod1} else {slsperiod = slsperiod1 + ' to ' + slsperiod2};
		slsera1 = sls[1].split("MAX_ERA = \'")[1];
		slsera1 = slsera1.split("\'")[0];
		slsera2 = sls[1].split("MIN_ERA = \'")[1];
		slsera2 = slsera2.split("\'")[0];
		if (slsera1 == slsera2) {slsera = slsera1} else {slsera = slsera1 + ' to ' + slsera2};
		slseon1 = sls[1].split("MAX_EON = \'")[1];
		slseon1 = slseon1.split("\'")[0];
		slseon2 = sls[1].split("MIN_EON = \'")[1];
		slseon2 = slseon2.split("\'")[0];
		if (slseon1 == slseon2) {slseon = slseon1} else {slseon = slseon1 + ' to ' + slseon2};		
	    slscontent = 'Surface deposit: ' + slsname + '<br/>Description: ' + slsdesc + '<br/>Age:' + slsage + '<br/>Epoch: ' + slsepoch + '<br/>Subperiod: ' + slssubperiod + '<br/>Period: ' + slsperiod + '<br/>Era: ' + slsera + '<br/>Eon: ' + slseon + '<br/><br/>Locaton: ' + bngString + '<br/>';
    };
 
    bedrockcontent = '';
    bedrock = content.split('@BGS.50k.Bedrock');
    if (bedrock.length > 1) {
        name = bedrock[1].split(";")[30];
        if (name != '') {name = 'Bedrock: ' + name};        
        age1 = bedrock[1].split(";")[31];
        age2 = bedrock[1].split(";")[32];
        if (age1 == age2) {age = age1} else {age = age1 + ' to ' + age2};
        if (age != '') {age = '<br/>Age: ' + age}; 
        period1 = bedrock[1].split(";")[45];
        period2 = bedrock[1].split(";")[46];
        if (period1 == period2) {period = period1} else {period = period1 + ' to ' + period2};
        if (period != '') {period = '<br/>Period: ' + period}; 
        type = bedrock[1].split(";")[47];
        if (type != '') {
			type = type[0].toUpperCase() + type.slice(1);
			type = '<br/>Type: ' + type
		};
        desc = bedrock[1].split(";")[48];
        if (desc != '') {
            desc = desc[0].toUpperCase() + desc.slice(1);			
			desc = '<br/>Description: ' + desc
		};
        sett1 = bedrock[1].split(";")[49];
        if (sett1 != '') {
            sett1 = sett1[0].toUpperCase() + sett1.slice(1);			
			sett1 = '<br/>Setting: ' + sett1
		};
        sett2 = bedrock[1].split(";")[50];
        if (sett2 == 'Null'){sett2 = ''};
        detail = bedrock[1].split(";")[51];
        if (detail != '') {detail = '<br/>Detail: ' + detail};
        bedrockcontent =  name + age + period + type + desc + sett1 + ' ' + sett2 + detail + '<br/><br/>Locaton: ' + bngString + '<br/>';
     };
    linearcontent = '';
    linear = content.split('@BGS.50k.Linear.features');
    if (linear.length > 1) {
		lname = linear[1].split(/;/)[15];
		linearcontent = 'Linear feature: ' + lname + '<br/><br/>Locaton: ' + bngString + '<br/>';
	};	
    superficialcontent = '';
    superficial = content.split('@BGS.50k.Superficial.deposits');

    if (superficial.length > 1) {
		sname = superficial[1].split(/;/)[30];
		if (sname != '') {sname = 'Surface deposit: ' + sname};        
        sage1 = superficial[1].split(/;/)[31];
        sage2 = superficial[1].split(/;/)[32];
        if (sage1 == sage2) {sage = sage1} else {sage = sage1 + ' to ' + sage2};
        if (sage != '') {sage = '<br/>Age: ' + sage};         
        speriod1 = superficial[1].split(/;/)[45];
        speriod2 = superficial[1].split(/;/)[46];
        if (speriod1 == speriod2) {speriod = speriod1} else {speriod = speriod1 + ' to ' + speriod2};
        if (speriod != '') {speriod = '<br/>Period: ' + speriod}; 
        stype = superficial[1].split(";")[47];
        if (stype != '') {
			stype = stype[0].toUpperCase() + stype.slice(1);
			stype = '<br/>Type: ' + stype
		};
        sdesc = superficial[1].split(";")[48];
        if (sdesc != '') {
            sdesc = sdesc[0].toUpperCase() + sdesc.slice(1);			
			sdesc = '<br/>Description: ' + sdesc
		};
        ssett1 = superficial[1].split(";")[49];
        if (ssett1 != '') {
            ssett1 = ssett1[0].toUpperCase() + ssett1.slice(1);			
			ssett1 = '<br/>Setting: ' + ssett1
		};
        ssett2 = superficial[1].split(";")[50];
        if (ssett2 == 'Null'){ssett2 = ''};
        sdetail = superficial[1].split(";")[51];
        if (sdetail != '') {sdetail = '<br/>Detail: ' + sdetail};
        superficialcontent =  sname + sage + speriod + stype + sdesc + ssett1 + ' ' + ssett2 + sdetail + '<br/><br/>Locaton: ' + bngString + '<br/>';
    };
    masscontent = '';
    mass = content.split('@BGS.50k.Mass.movement');

    if (mass.length > 1) {
		mname = mass[1].split(/;/)[23];
        mage1 = mass[1].split(/;/)[24];
        mage2 = mass[1].split(/;/)[25];
        if (mage1 == mage2) {mage = mage1} else {mage = 'From ' + mage1 + ' to ' + mage2};
     masscontent =  'Mass movement: ' + mname + '<br/>Age: ' + mage + '<br/><br/>Locaton: ' + bngString + '<br/>';
    };
    
    artcontent = '';
    art = content.split('@BGS.50k.Artificial.ground');

    if (art.length > 1) {
		aname = art[1].split(/;/)[23];
        amage1 = art[1].split(/;/)[24];
        amage2 = art[1].split(/;/)[25];
        if (amage1 == amage2) {amage = amage1} else {amage = 'From ' + amage1 + ' to ' + amage2};
     artcontent =  'Artificial: ' + aname + '<br/>Age: ' + amage + '<br/><br/>Locaton: ' + bngString + '<br/>';;
    };

    content = blscontent + slscontent + bedrockcontent + superficialcontent + masscontent + artcontent + linearcontent;
    //if (content.length < 10) {content='No visible geology'};
    // + content;

    L.popup({ maxWidth: 400})
      .setLatLng(latlng)
      .setContent('<div style="overflow:auto">' + content + '<div>')
      .openOn(this._map);
  }
});

L.tileLayer.betterWms = function (url, options) {
  return new L.TileLayer.BetterWMS(url, options);  
};
