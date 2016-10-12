(function($) {
  $.fn.calculatorize = function(options) {
    var settings = $.extend({
      inputUnits: ['km', 'miles'],
      inputConversions: {
	'km':    1000.0,
	'miles': 1609.34
      },
      outputConversions: {
	kph: 3.6,
	mph: 2.23694,
	minPerKm: 16.6666667,
	minPerMile: 26.8224
      }
    }, options);

    var populateInputUnits = function(list, units) {
      $(list).each(function() {
	var selectList = this;
	units.forEach(function(unitName) {
	  var option = $('<option/>');
	  option.attr({ value: unitName }).text(unitName);
	  $(selectList).append(option);
	})
      });
    }

    var convertDistanceToMeters = function(dist, unit) {
      if (dist && unit) {
	dist = parseFloat(dist);
	var meterConversion = settings.inputConversions[unit];
	return meterConversion * dist;
      }
      else {
	return;
      }
    }

    var convertMetersToOutputUnit = function(meters, unit) {
      if (meters && unit) {
	var meterConversion = settings.inputConversions[unit];
	return (meters / meterConversion).toFixed(2);
      }
      else {
	return;
      }
    }

    var convertToMetersPerSecond = function(dist, unit, time) {
      if (dist && unit && time) {
	meters = convertDistanceToMeters(dist, unit);
	seconds = convertTimeStringToSeconds(time);

	metersPerSecond = meters / seconds;
	return metersPerSecond
      }
      else {
	return;
      }
    }

    var convertToFormattedString = function(metersPerSecond, outputUnit) {
      if (isSpeedUnit(outputUnit)) {
	return convertToSpeedString(metersPerSecond, outputUnit);
      }
      else {
	return convertToPaceString(metersPerSecond, outputUnit);
      }
    }

    var convertToSpeedString = function(metersPerSecond, unit) {
      var conversionRate = settings.outputConversions[unit];
      var convertedValue = metersPerSecond * conversionRate;
      return convertedValue.toFixed(2);
    }

    var convertToPaceString = function(metersPerSecond, unit) {
      var conversionRate = settings.outputConversions[unit];
      var convertedValue = conversionRate / metersPerSecond;
      
      var wholeMinutes = Math.floor(convertedValue);
      var fractionalMinutes = convertedValue - wholeMinutes;
      var wholeSeconds = Math.round(fractionalMinutes * 60.0);

      var secondsString = wholeSeconds.toString();
      if (secondsString.length == 1) {
	secondsString = '0' + secondsString;
      }

      return wholeMinutes.toString() + ':' + secondsString;
    }

    var convertTimeStringToSeconds = function(timeStr) {
      var SECONDS_PER_MINUTE = 60.0;
      var MINUTES_PER_HOUR = 60.0;

      var components = timeStr.split(':');
      var timeFloat = 0.0;
      var seconds, minutes, hours;
      if (seconds = components.pop()) {
	timeFloat += parseFloat(seconds);
      }

      if (minutes = components.pop()) {
	timeFloat += parseFloat(minutes) * SECONDS_PER_MINUTE;
      }

      if (hours = components.pop()) {
	timeFloat += parseFloat(hours) * MINUTES_PER_SECOND * SECONDS_PER_MINUTE;
      }

      return timeFloat;
    }

    var isSpeedUnit = function(unitName) {
      return /ph$/.test(unitName);
    }

    return this.each(function() {
      var distanceInput = $(this).find('input.distance');
      var timeInput = $(this).find('input.time');
      var unitSelect = $(this).find('select.units');

      var handleInputChange = function() {
	var distStr = distanceInput.val();
	var unit = unitSelect.val(); 
	var timeStr = timeInput.val();
	if (distStr && unit && timeStr) {
	  updateDistances(distStr, unit);

	  var metersPerSecond = convertToMetersPerSecond(distStr, unit, timeStr);
	  updateSpeedsAndPaces(metersPerSecond);
	}
      }

      var updateDistances = function(distStr, inputUnit) {
	if ($('#results').is(':hidden')) {
	  $('#results').slideDown(function() {
	    updateDistances(distStr, inputUnit);
	  });
	}
	else {
	  for (outputUnit in settings.inputConversions) {
	    var meters = convertDistanceToMeters(distStr, inputUnit);
	    (function(unit) {
	      var resultSpan = $('#results span#' + unit);
	      var outputString = convertMetersToOutputUnit(meters, unit);
	      resultSpan.fadeOut().promise().done(function() {
		var outputString = convertMetersToOutputUnit(meters, unit);
		$(this).text(outputString);
		$(this).fadeIn();
	      });
	    })(outputUnit);
	  }
	}
      }

      var updateSpeedsAndPaces = function(metersPerSecond) {
	if ($('#results').is(':hidden')) {
	  $('#results').slideDown(function() {
	    updateSpeedsAndPaces(metersPerSecond);
	  });
	}
	else {
	  for (outputUnit in settings.outputConversions) {
	    (function(unit) {
	      var outputString = convertToFormattedString(metersPerSecond, unit);
	      var resultSpan = $('#results span#' + unit);
	      resultSpan.fadeOut().promise().done(function() {
		$(this).text(outputString);
		$(this).fadeIn();
	      });
	    })(outputUnit);
	  }
	}
      }

      populateInputUnits(unitSelect, settings.inputUnits);

      distanceInput.focus();

      distanceInput.on('change', function(event) {
	handleInputChange();
      });

      timeInput.on('change', function(event) {
	var timeStr = timeInput.val();
	if (/^\d+$/.test(timeStr)) {
	  timeStr = timeStr + ':00';
	  timeInput.val(timeStr);
	}
	handleInputChange();
      });

      unitSelect.on('change', function(event) {
	handleInputChange();
      });

    });
  }
}(jQuery));
