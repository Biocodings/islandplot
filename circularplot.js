var circularTrackDefaults = {
    radius: 5,
    w: 600,
    h: 600,
    factor: 1,
    factorLegend: .85,
    TranslateX: 80,
    TranslateY: 30,
    ExtraWidthX: 100,
    ExtraWidthY: 100,
    radians: 2 * Math.PI,
    spacing: 100000,
    legend_spacing: 5,
}

function circularTrack(layout,tracks) {

    this.tracks = tracks;
    this.layout = layout;
    this.numTracks = tracks.length;

    if('undefined' !== typeof layout) {
	    // Copy over any defaults not passed in
	    // by the user
	    for(var i in circularTrackDefaults) {
		if('undefined' == typeof layout[i]) {
		    this.layout[i] = circularTrackDefaults[i];
		}
	    }
	}

    // Setup some constants we'll need and build the canvas
    this.layout.radians_pre_bp = this.layout.radians/this.layout.genomesize;
    this.layout.radius = this.layout.factor*Math.min(this.layout.w/2, this.layout.h/2);
    this.xScale = d3.scale.linear()
	.range([0,this.layout.radians])
	.domain([0, layout.genomesize]);
    d3.select(layout.container).select("svg").remove();

    this.g = d3.select(layout.container)
	.append("svg")
	.attr("width", this.layout.w+this.layout.ExtraWidthX)
	.attr("height", this.layout.h+this.layout.ExtraWidthY)
	.append("g")
	.attr("transform", "translate(" + this.layout.TranslateX + "," + this.layout.TranslateY + ")");

    // Now we can start drawing the plots, first the basic axis...
    this.drawAxis();

    // Draw the plots
    for(var i=0; i < tracks.length; i++) {

	if('undefined' !== typeof tracks[i].visible) {
	    if(! tracks[i].visible) {
		continue;
	    }
	}

	// We're going to see what type of tracks we have
	// and dispatch them appropriately

	switch(tracks[i].trackType) {
	case "plot":
	    this.drawPlot(i);
	    break;
	case "track":
	    this.drawTrack(i);
	    break;
	case "stranded":
	    this.drawTrack(i);
	    break;
	case "glyph":
	    this.drawGlyphTrack(i);
	    break;
	default:
	    // Do nothing for an unknown track type
	}
    }
}

circularTrack.prototype.drawAxis = function() {
    var cfg = this.layout;
    var g = this.g;

    var axis = g.selectAll(".axis")
    .data(d3.range(0,cfg.genomesize, cfg.spacing))
    .enter()
    .append("g")
    .attr("class", "axis");

    axis.append("line")
    .attr("x1", function(d, i){return cfg.w/2 + (20*Math.cos((d*cfg.radians_pre_bp)-Math.PI/2));})
    .attr("y1", function(d, i){return cfg.h/2 + (20*Math.sin((d*cfg.radians_pre_bp)-Math.PI/2));})
    .attr("x2", function(d, i){return cfg.w/2 + (cfg.radius*Math.cos((d*cfg.radians_pre_bp)-Math.PI/2));})
    .attr("y2", function(d, i){return cfg.h/2 + (cfg.radius*Math.sin((d*cfg.radians_pre_bp)-Math.PI/2));})
    .attr("class", "line")
    .style("stroke", "grey")
    .style("stroke-width", "1px");

    var axis_label = g.selectAll(".axislabel")
    .data(d3.range(0,cfg.genomesize, cfg.spacing*cfg.legend_spacing))
    .enter()
    .append("g")
    .attr("class", "axislabel");
      
    axis_label.append("text")
    .attr("class", "legend")
    .text(function(d){ var prefix = d3.formatPrefix(d);
	    return prefix.scale(d) + prefix.symbol;
	})
    .style("font-family", "sans-serif")
    .style("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("dy", "1.5em")
    .attr("transform", function(d, i){return "translate(0, -10)"})
    .attr("x", function(d, i){return cfg.w/2 + ((cfg.radius+10)*Math.cos((d*cfg.radians_pre_bp)-Math.PI/2));})
    .attr("y", function(d, i){return cfg.h/2 + ((cfg.radius+10)*Math.sin((d*cfg.radians_pre_bp)-Math.PI/2));});

    // And draw the pretty outer circle for the axis
    this.drawCircle("outerAxis", cfg.radius-10, 'grey');
}

// Helper function for drawing needed circles such
// as in stranded tracks
// Can be called standalone in setting up the look
// of your genome

circularTrack.prototype.drawCircle = function(name, radius, line_stroke, animate) {
    var g = this.g;
    var cfg = this.layout;

    g.append("circle")
    .attr("r", (('undefined' == typeof animate) ? radius : 1 ))
    .attr("class", name + "_circle")
    .style("fill", "none")
    .style("stroke", line_stroke)
    .attr("cx", cfg.w/2)
    .attr("cy", cfg.h/2);

    // An animated entrance
    if('undefined' !== typeof animate) {
	this.moveCircle(name, radius);
    }
}

// Change the radius of an inscribed circle

circularTrack.prototype.moveCircle = function(name, radius) {
    var g = this.g;
    
    g.selectAll("." + name + "_circle")
    .transition()
    .duration(1000)
    .attr("r", radius);
}

// Remove a drawn circle, in a pretty animated way

circularTrack.prototype.removeCircle = function(name) {
    var g = this.g;

    g.selectAll("." + name + "_circle")
    .transition()
    .duration(1000)
    .attr("r", 1)
    .style("opacity", 0)
    .remove();
}

/////////////////////////////////////////
//
// Plot type tracks (as in line graphs)
//
/////////////////////////////////////////

circularTrack.prototype.drawPlot = function(i, animate) {
    var g = this.g;
    var cfg = this.layout;
    var track = this.tracks[i];

    var plotRange = d3.scale.linear()
    .domain([track.plot_min, track.plot_max])
    .range([track.plot_radius-(track.plot_width/2), track.plot_radius+(track.plot_width/2)]);

    var lineFunction = d3.svg.line()
    .x(function(d, i) { return cfg.w/2 + ((('undefined' == typeof animate) ? plotRange(d) : 1 )*Math.cos((i*track.bp_per_element*cfg.radians_pre_bp)-(Math.PI/2))); })
    .y(function(d, i) { return cfg.h/2 + ((('undefined' == typeof animate) ? plotRange(d) : 1 )*Math.sin((i*track.bp_per_element*cfg.radians_pre_bp)-(Math.PI/2))); })
    .interpolate("linear");

    g.append("path")
    .attr("d", lineFunction(track.items))
    .attr("class", track.trackName)
    .attr("id", track.trackName)
    .attr("stroke-width", 1)
    .attr("fill", "none");

    // Now do the mean circle if we have one
    if('undefined' !== typeof track.plot_mean) {
	this.drawCircle(track.trackName, plotRange(track.plot_mean), "grey", animate);
    }  

    // And if we're doing an animated entrance...
    if('undefined' !== typeof animate) {
	this.movePlot(i, track.plot_radius);
    }

    // Mark the track as visible, if not already
    this.tracks[i].visible = true;
}

circularTrack.prototype.movePlot = function(i, radius) {
    var g = this.g;
    var cfg = this.layout;
    var track = this.tracks[i];

    // Save this in case this is a change of radius
    // ratherthan an animated entrance
    this.tracks[i].plot_radius = radius;

     var plotRange = d3.scale.linear()
    .domain([track.plot_min, track.plot_max])
    .range([track.plot_radius-(track.plot_width/2), track.plot_radius+(track.plot_width/2)]);

    var lineFunction = d3.svg.line()
    .x(function(d, i, j) { return cfg.w/2 + (plotRange(d)*Math.cos((i*track.bp_per_element*cfg.radians_pre_bp)-(Math.PI/2))); })
    .y(function(d, i) { return cfg.h/2 + (plotRange(d)*Math.sin((i*track.bp_per_element*cfg.radians_pre_bp)-(Math.PI/2))); })
    .interpolate("linear");

    var plot = g.selectAll("." + track.trackName)

    plot.transition()
    .duration(1000)
    .attr("d", function(d,i) { return lineFunction(track.items)});
}

circularTrack.prototype.removePlot = function(i) {
    var g = this.g;
    var cfg = this.layout;
    var track = this.tracks[i];

    var plotRange = d3.scale.linear()
    .domain([track.plot_min, track.plot_max])
    .range([1-(track.plot_width/2), 1+(track.plot_width/2)]);

    var lineFunction = d3.svg.line()
    .x(function(d, i) { return cfg.w/2 + (plotRange(d)*Math.cos((i*track.bp_per_element*cfg.radians_pre_bp)-(Math.PI/2))); })
    .y(function(d, i) { return cfg.h/2 + (plotRange(d)*Math.sin((i*track.bp_per_element*cfg.radians_pre_bp)-(Math.PI/2))); })
    .interpolate("linear");

    g.selectAll("." + track.trackName)
    .transition()
    .duration(1000)
    .attr("d", lineFunction(track.items))
    .style("opacity", 0)
    .remove();

      if('undefined' !== typeof track.plot_mean) {
	  this.removeCircle(track.trackName);
      }

    // Mark the track as not visible
    this.tracks[i].visible = false;
}

////////////////////////////////////////////////
//
// Track type tracks (as blocks without strands)
//
////////////////////////////////////////////////

circularTrack.prototype.drawTrack = function(i, animate) {
    var g = this.g;
    var cfg = this.layout;
    var track = this.tracks[i];

    // The arc object which will be passed in to each
    // set of data
    var arc = d3.svg.arc()
    .innerRadius(function(d){ return (('undefined' == typeof animate) ? 
				      calcInnerRadius(track.inner_radius, track.outer_radius, d.strand) 
				      : 1);})
    .outerRadius(function(d){ return (('undefined' == typeof animate) ? 
				      calcOuterRadius(track.inner_radius, track.outer_radius, d.strand)
				      : 2);})
    .startAngle(function(d){return cfg.radians_pre_bp*d.start;})
    .endAngle(function(d){return cfg.radians_pre_bp*d.end;})
      
    // Draw the track, putting in elements such as hover colour change
    // if one exists, click events, etc
    g.selectAll(".tracks."+track.trackName)
    .data(track.items)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("class", function(d) { return track.trackName + ('undefined' !== typeof d.strand ? '_' + (d.strand == 1 ? 'pos' : 'neg') : '') })
    //      .style("fill", function(d) { return ('undefined' !== typeof d.fill) ? d.fill : track_layout.fill})
    .attr("transform", "translate("+cfg.w/2+","+cfg.h/2+")")
    .on("click", function(d,i) {
	    if('undefined' !== typeof track.mouseclick) {
		track.mouseclick(d,i);
	    }
	});

    // If we're doing an animated addition, move the track out to its
    // new spot
    if('undefined' !== typeof animate) {
	this.moveTrack(i, track.inner_radius, track.outer_radius);
    }

    // And check if we've been asked to do a centre line
    if('undefined' !== typeof track.centre_line_stroke) {
	this.drawCircle(track.trackName, (track.inner_radius + track.outer_radius)/2, track.centre_line_stroke, animate);
      }

    tracks[i].visible = true;

}

circularTrack.prototype.moveTrack = function(i, innerRadius, outerRadius) {
    var g = this.g;
    var cfg = this.layout;
    var track = this.tracks[i];

    var arcShrink = d3.svg.arc()
    .innerRadius(function(d){return calcInnerRadius(innerRadius, outerRadius, d.strand);})
    .outerRadius(function(d){return calcOuterRadius(innerRadius, outerRadius, d.strand);})
    .endAngle(function(d){return cfg.radians_pre_bp*d.start;})
    .startAngle(function(d){return cfg.radians_pre_bp*d.end;});

    g.selectAll("." + track.trackName + ", ." + track.trackName + "_pos, ." + track.trackName + "_neg")
    .transition()
    .duration(1000)
    .attr("d", arcShrink)

    // Just record the new radii in case we need them later
    tracks[i].inner_radius = innerRadius;
    tracks[i].outer_radius = outerRadius;
}

circularTrack.prototype.removeTrack = function(i) {
    var g = this.g;
    var cfg = this.layout;
    var track = this.tracks[i];

    var arcShrink = d3.svg.arc()
    .innerRadius(1)
    .outerRadius(2)
    .endAngle(function(d){return cfg.radians_pre_bp*d.start;})
    .startAngle(function(d){return cfg.radians_pre_bp*d.end;});

    g.selectAll("." + track.trackName + ", ." + track.trackName + "_pos, ." + track.trackName + "_neg")
    .transition()
    .duration(1000)
    .attr("d", arcShrink)
    .style("opacity", 0)
    .remove();

    if('undefined' !== track.centre_line_stroke) {
	this.removeCircle(track.trackName);
    }

    tracks[i].visible = false;

}

////////////////////////////////////////////////
//
// Glyph type tracks
//
////////////////////////////////////////////////

// We will probably need to send a localized
// version of the data so the update works
// properly

circularTrack.prototype.drawGlyphTrack = function(i) {
    var g = this.g;
    var cfg = this.layout;
    var track = this.tracks[i];
    var stack_count = 0;

    var x = function(d,i,proximity) { return cfg.w/2 + (((proximity == true ? (track.glyph_buffer * stack_count) : 0) + track.radius)*Math.cos((d.bp*cfg.radians_pre_bp)-Math.PI/2)); };
    var y = function(d,i,proximity) { return cfg.h/2 + (((proximity == true ? (track.glyph_buffer * stack_count) : 0) + track.radius)*Math.sin((d.bp*cfg.radians_pre_bp)-Math.PI/2)); };

    var test_proximity = function(d,i) {
	var xs = 0;
	var ys = 0;

	if(i < 1) { return false; }

	xs = (cfg.h/2 + (track.radius*Math.sin((d.bp*cfg.radians_pre_bp)-Math.PI/2))) -
	(cfg.h/2 + (track.radius*Math.sin((track.items[i-1].bp*cfg.radians_pre_bp)-Math.PI/2)));
	ys = (cfg.h/2 + (track.radius*Math.cos((d.bp*cfg.radians_pre_bp)-Math.PI/2))) -
	(cfg.h/2 + (track.radius*Math.cos((track.items[i-1].bp*cfg.radians_pre_bp)-Math.PI/2)));
	xs = xs * xs;
	ys = ys * ys;
	var dist = Math.sqrt(xs + ys);

	if(dist < track.pixel_spacing) { stack_count++; return true; }

	stack_count = 0;
	return false;
    }

    var track = g.selectAll('.' + track.trackName)
    .data(track.items)
    .enter()
    .append('path')
    .attr('class', function(d) {return track.trackName + '_' + d.type})
    .attr("d", d3.svg.symbol().type(track.glyphType))
    .attr("transform", function(d,i) { var proximity = test_proximity(d,i); 
				       return "translate(" + x(d,i, proximity) + ","
				       + y(d,i, proximity) + ")" })

}

circularTrack.prototype.updateGlyphTrack = function(i) {
    var g = this.g;
    var cfg = this.layout;
    var track = this.tracks[i];
    var stack_count = 0;

    
}

////////////////////////////////////////////////
//
// Brush functionality
//
////////////////////////////////////////////////

circularTrack.prototype.attachBrush = function(callbackObj) {
    var g = this.g;
    var cfg = this.layout;
    var xScale = this.xScale;
    var self = this;

    this.brushCallbackObj = callbackObj;

    this.brushStart = 0;
    this.brushEnd = 0;
    this.brushStartBP = 0;
    this.brushEndBP = 0;

    this.brushArc = d3.svg.arc()
    .innerRadius(20)
    .outerRadius(cfg.radius-10)
    .endAngle(function(d){return xScale(0);})
    .startAngle(function(d){return xScale(0);});

    g.append("path")
    .attr("d", this.brushArc)
    .attr("id", "polarbrush")
    .attr("class", "polarbrush")
    .attr("transform", "translate("+cfg.w/2+","+cfg.h/2+")")

    var dragStart = d3.behavior.drag()
    .on("drag", function(d) {
	    var mx = d3.mouse(this)[0];
	    var my = d3.mouse(this)[1];

	    var curRadandBP = calcRadBPfromXY((d3.mouse(this)[0] - (cfg.w/2)),
					      -(d3.mouse(this)[1] - (cfg.h/2)),
					      xScale);

	    d3.select("#brushStart")		
	    .attr("cx", function(d, i){return cfg.h/2 + (cfg.radius-10)*Math.cos((curRadandBP[0])-Math.PI/2);})
	    .attr("cy", function(d, i){return cfg.h/2 + (cfg.radius-10)*Math.sin((curRadandBP[0])-Math.PI/2); });
		
	    self.brushStart = curRadandBP[0];
	    self.brushStartBP = curRadandBP[1];
	    self.moveBrush(self.brushStart, self.brushEnd);
	    if('undefined' !== typeof self.brushCallbackObj) {
		self.brushCallbackObj.update(self.brushEndBP, self.brushStartBP);
	    }
	});

    var dragEnd = d3.behavior.drag()
    .on("drag", function(d) {
	    var mx = d3.mouse(this)[0];
	    var my = d3.mouse(this)[1];

	    var curRadandBP = calcRadBPfromXY((d3.mouse(this)[0] - (cfg.w/2)),
					      -(d3.mouse(this)[1] - (cfg.h/2)),
					      xScale);

	    d3.select("#brushEnd")		
	    .attr("cx", function(d, i){return cfg.h/2 + (cfg.radius-10)*Math.cos((curRadandBP[0])-Math.PI/2);})
	    .attr("cy", function(d, i){return cfg.h/2 + (cfg.radius-10)*Math.sin((curRadandBP[0])-Math.PI/2); });
		
	    self.brushEnd = curRadandBP[0];
	    self.brushEndBP = curRadandBP[1];
	    self.moveBrush(self.brushStart, self.brushEnd);
	    if('undefined' !== typeof self.brushCallbackObj) {
		self.brushCallbackObj.update(self.brushEndBP, self.brushStartBP);
	    }
	});

    g.append("circle")
    .attr({
	    id: 'brushEnd',
		cx: (cfg.w/2 + ((cfg.radius-10)*Math.cos((this.xScale(0))-Math.PI/2))),
		cy: (cfg.h/2 + ((cfg.radius-10)*Math.sin((this.xScale(0))-Math.PI/2))),
		r: 5,
	    })
            .call(dragEnd);

    g.append("circle")
    .attr({
	    id: 'brushStart',
		cx: (cfg.w/2 + ((cfg.radius-10)*Math.cos((this.xScale(0))-Math.PI/2))),
		cy: (cfg.h/2 + ((cfg.radius-10)*Math.sin((this.xScale(0))-Math.PI/2))),
		r: 5,
		})
    .call(dragStart);

    // Create the start and stop pointers

}

circularTrack.prototype.moveBrush = function(startRad, endRad) {
    var g = this.g;
    var cfg = this.layout;

    //    console.log("moving brush to " + startRad, endRad);

    this.brushArc
    .startAngle(startRad)
    .endAngle(endRad);

    d3.select('#polarbrush')
    .attr("d", this.brushArc);
    
}

////////////////////////////////////////////////
//
// Utility functions
//
////////////////////////////////////////////////

circularTrack.prototype.showTrack = function(name) {
    var i = this.findTrackbyName(name);

    // We didn't find the track by that name
    if(i < 0) {
	return;
    }

    // Is it already visible? Do nothing
    if(this.tracks[i].visible) {
	return;
    }

    switch(tracks[i].trackType) {
    case "plot":
    this.drawPlot(i, true);
        break;
    case "track":
    this.drawTrack(i, true);
        break;
    case "stranded":
    this.drawTrack(i, true);
        break;
    case "glyph":
        // Do nothing for a glyph type, special case
        // but leave this as a placeholder for now
        break;
    default:
    // Do nothing for an unknown track type
    }

}

circularTrack.prototype.hideTrack = function(name) {
    var i = this.findTrackbyName(name);

    // We didn't find the track by that name
    if(i < 0) {
	return;
    }

    // Is it already visible? Do nothing
    if(! this.tracks[i].visible) {
	return;
    }

    switch(tracks[i].trackType) {
    case "plot":
        this.removePlot(i);
        break;
    case "track":
        this.removeTrack(i);
        break;
    case "stranded":
        this.removeTrack(i);
        break;
    case "glyph":
        // Do nothing for a glyph type, special case
        // but leave this as a placeholder for now
        break;
    default:
    // Do nothing for an unknown track type
    }

}

////////////////////////////////////////////////
//
// Helper functions
//
////////////////////////////////////////////////

circularTrack.prototype.findTrackbyName = function(name) {
    var tracks = this.tracks;

    for(var i=0; i < tracks.length; i++) {
	if(tracks[i].trackName == name) {
	    return i;
	}
    }

    return -1;

}

// If we're displaying a stranded track, calculate
// the inner radius depending on which strand the 
// gene is on.

function calcInnerRadius(inner, outer, strand) {
    if('undefined' == typeof strand) {
	return inner;
    } else if(strand == -1) {
	return inner;
    } else {
	return (inner+outer)/2;
    }
}

// If we're displaying a stranded track, calculate
// the outer radius depending on which strand the 
// gene is on.
    
function calcOuterRadius (inner, outer, strand) {
    if('undefined' == typeof strand) {
	return outer;
    } else if(strand == -1) {
	return (inner+outer)/2;
    } else {
	return outer;
    }
}

function calcRadBPfromXY (x,y,xScale) {
    var rad = Math.PI/2 - Math.atan(y/x);
    if(x < 0) {
	// II & III quadrant
	rad = rad + Math.PI;
    }
    return [rad,Math.floor(xScale.invert(rad))];
}