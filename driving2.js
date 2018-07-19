var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');

var NUM_SENSORS = 20;
var DIST_1 = 5.0;
var DIST_2 = 2.5;
var N0 = 5;
var N1 = 4;

var rotate_point = function(pt, theta) {
	var pt_p = {x: 0, y: 0};
	pt_p.x = pt.x * Math.cos(theta) - pt.y * Math.sin(theta);
	pt_p.y = pt.y * Math.cos(theta) + pt.x * Math.sin(theta);
	return pt_p;
};

var distance_between_points = function(pt0, pt1) {
	var dx = pt0.x - pt1.x;
	var dy = pt0.y - pt1.y;
	return Math.sqrt(dx * dx + dy * dy);
};

var ray_circle_closest_intersection = function(ro, rd, co, cr) {
	var px = ro.x - co.x;
	var py = ro.y - co.y;
	
	var a = rd.x * rd.x + rd.y * rd.y;
	var b = 2 * (px * rd.x + py * rd.y);
	var c = px * px + py * py - cr * cr;
	
	var discriminant = b * b - 4 * a * c;
	if (discriminant < 0) {
		return null;
	}
	
	var t0 = (-b + Math.sqrt(discriminant)) / (2 * a);
	var t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
	var t = Math.min(t0, t1);
	
	return t;
	
	//return {x: ro.x + rd.x * t, y: ro.y + rd.y * t};
};

var closest_pt_on_line_segment = function(pt, l0, l1) {
	var vx = l0.x;
	var vy = l0.y;
	var wx = l1.x;
	var wy = l1.y;
	var px = pt.x;
	var py = pt.y;
	
	var l2 = (wx - vx) * (wx - vx) + (wy - vy) * (wy - vy);
	if (l2 == 0.0) return {x: vx, y: vy};
	var t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
	t = Math.max(0.0, Math.min(1.0, t));
	
	var qx = vx + t * (wx - vx);
	var qy = vy + t * (wy - vy);
	return {x: qx, y: qy};
};

var Obstacle = function(position, radius) {
	var me = this;
	
	me.position = position;
	me.radius = radius;
	
	me.draw = function() {
		var ctx = canvas.getContext('2d');
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 1;
		ctx.beginPath();
		
		var p = {x: me.position.x, y: me.position.y};
		p.x = (p.x + 10) / 20 * canvas.width;
		p.y = canvas.width - (p.y + 10) / 20 * canvas.width;
		ctx.arc(p.x, p.y, me.radius / 20 * canvas.width, 0, 2 * Math.PI);
		ctx.stroke();
	};
};

var obstacles = [];

for (var i = 0; i < 5; i++) {
	obstacles.push(new Obstacle({x: 5.0, y: (i - 2) * 5.0}, 1.0));
	obstacles.push(new Obstacle({x: -5.0, y: (i - 2) * 5.0}, 1.0));
	obstacles.push(new Obstacle({x: 10.0, y: (i - 2) * 5.0}, 1.0));
	obstacles.push(new Obstacle({x: -10.0, y: (i - 2) * 5.0}, 1.0));
}

obstacles.push(new Obstacle({x: 0.0, y: 3.0}, 1.0));
obstacles.push(new Obstacle({x: 0.0, y: 8.0}, 1.0));
obstacles.push(new Obstacle({x: 0.0, y: -3.0}, 1.0));
obstacles.push(new Obstacle({x: 0.0, y: -8.0}, 1.0));

var Car = function() {
	var me = this;
	
	me.acceleration = 0.0;
	me.velocity = 1.0;
	me.heading = 0.0;
	me.tire_heading = 0.0;
	me.position = {x: 0.0, y: 0.0};
	me.did_collide = false;
	me.sensors = [];
	for (var i = 0; i < NUM_SENSORS; i++) {
		me.sensors[i] = DIST_1;
	}
	
	me.update = function(dt) {
		if (me.did_collide) {
			me.did_collide = false;
			me.position.x = 0.0;
			me.position.y = 0.0;
			me.heading = 0.0;
			me.tire_heading = 0.0;
		}
		
		//me.velocity = me.velocity + me.acceleration * dt;
		me.position.x = me.position.x + me.velocity * Math.cos(me.heading) * dt;
		me.position.y = me.position.y + me.velocity * Math.sin(me.heading) * dt;
		
		var angle = me.velocity * Math.sin(me.tire_heading) * dt;
		me.heading += angle;
		while (me.heading <= -Math.PI) me.heading += 2.0 * Math.PI;
		while (me.heading > Math.PI) me.heading -= 2.0 * Math.PI;
			
		var car_pts = me.get_points();
		for (var i = 0; i < 4; i++) {
			if (car_pts[i].x < -10.0 || car_pts[i].y < -10.0 || car_pts[i].x > 10.0 || car_pts[i].y > 10.0) {
				me.did_collide = true;
			}
		}
		
		var car_line_segments = [
			[car_pts[0], car_pts[1]],
			[car_pts[1], car_pts[2]],
			[car_pts[2], car_pts[3]],
			[car_pts[3], car_pts[0]]]
		
		for (var i = 0; i < obstacles.length; i++) {	
			for (var j = 0; j < 4; j++) {
				var a = car_line_segments[j][0];
				var b = car_line_segments[j][1];
				var c = closest_pt_on_line_segment(obstacles[i].position, a, b);
				
				var dx = c.x - obstacles[i].position.x;
				var dy = c.y - obstacles[i].position.y;
				var dist_sqrd = dx * dx + dy * dy;
				if (dist_sqrd < obstacles[i].radius * obstacles[i].radius) {
					me.did_collide = true;
				}
			}
		}
		
		for (var i = 0; i < NUM_SENSORS; i++) {
			me.sensors[i] = DIST_1;
			
			var theta = -0.5 * Math.PI + Math.PI * (i / (NUM_SENSORS - 1)) + car.heading;
		
			var ro = {x: car.position.x, y: car.position.y};
			var rd = {x: Math.cos(theta), y: Math.sin(theta)};
			
			if (rd.x != 0.0) {
				var dist1 = (-10.0 - ro.x) / rd.x;
				if (dist1 > 0.0 && dist1 < me.sensors[i]) {
					me.sensors[i] = dist1;
				}
				
				var dist2 = (10.0 - ro.x) / rd.x;
				if (dist2 > 0.0 && dist2 < me.sensors[i]) {
					me.sensors[i] = dist2;
				}
			}
			
			if (rd.y != 0.0) {
				var dist1 = (-10.0 - ro.y) / rd.y;
				if (dist1 > 0.0 && dist1 < me.sensors[i]) {
					me.sensors[i] = dist1;
				}
				
				var dist2 = (10.0 - ro.y) / rd.y;
				if (dist2 > 0.0 && dist2 < me.sensors[i]) {
					me.sensors[i] = dist2;
				}		
			}
			
			for (var j = 0; j < obstacles.length; j++) {
				var dist = ray_circle_closest_intersection(ro, rd, obstacles[j].position, obstacles[j].radius);
				if (dist != null && dist < me.sensors[i] && dist > 0.0) {
					me.sensors[i] = dist;
				}
			}
		}
	};
	
	me.get_points = function() {
		var points = [];
		
		points.push(rotate_point({x: -1.0, y: -0.5}, me.heading));
		points.push(rotate_point({x: -1.0, y: 0.5}, me.heading));
		points.push(rotate_point({x: 1.0, y: 0.5}, me.heading));
		points.push(rotate_point({x: 1.0, y: -0.5}, me.heading));
		
		for (var i = 0; i < 4; i++) {
			points[i].x += me.position.x;
			points[i].y += me.position.y;
		}
		
		return points;
	};
	
	me.draw = function() {
		var p0 = rotate_point({x: -1.0, y: -0.5}, me.heading);
		p0.x += me.position.x;
		p0.y += me.position.y;
		p0.x = (p0.x + 10) / 20 * canvas.width;
		p0.y = canvas.width - (p0.y + 10) / 20 * canvas.width;
		
		var p1 = rotate_point({x: -1.0, y: 0.5}, me.heading);
		p1.x += me.position.x;
		p1.y += me.position.y;
		p1.x = (p1.x + 10) / 20 * canvas.width;
		p1.y = canvas.width - (p1.y + 10) / 20 * canvas.width;

		var p2 = rotate_point({x: 1.0, y: 0.5}, me.heading);
		p2.x += me.position.x;
		p2.y += me.position.y;
		p2.x = (p2.x + 10) / 20 * canvas.width;
		p2.y = canvas.width - (p2.y + 10) / 20 * canvas.width;
		
		var p3 = rotate_point({x: 1.0, y: -0.5}, me.heading);
		p3.x += me.position.x;
		p3.y += me.position.y;
		p3.x = (p3.x + 10) / 20 * canvas.width;
		p3.y = canvas.width - (p3.y + 10) / 20 * canvas.width;
						
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(p0.x, p0.y);
		ctx.lineTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.lineTo(p3.x, p3.y);
		ctx.lineTo(p0.x, p0.y);
		ctx.stroke();
		
		for (var i = 0; i < NUM_SENSORS; i++) {
			var theta = -0.5 * Math.PI + Math.PI * (i / (NUM_SENSORS - 1)) + car.heading;
			
			var p0 = {x: me.position.x, y: me.position.y};
			var p1 = {x: p0.x + DIST_1 * Math.cos(theta), y: p0.y + DIST_1 * Math.sin(theta)};

			p0.x = (p0.x + 10) / 20 * canvas.width;
			p0.y = canvas.width - (p0.y + 10) / 20 * canvas.width;
			p1.x = (p1.x + 10) / 20 * canvas.width;
			p1.y = canvas.width - (p1.y + 10) / 20 * canvas.width;

			if (me.sensors[i] < DIST_1) {
				ctx.strokeStyle = "#FF0000";
			} else {
				ctx.strokeStyle = "#000000";
			}
			
			//ctx.beginPath();
			//ctx.moveTo(p0.x, p0.y);
			//ctx.lineTo(p1.x, p1.y);
			//ctx.stroke();
		}	
	};
};

var car = new Car();

var get_state_and_reward = function() {
	var reward = 0.0;
	
	for (var i = 0; i < NUM_SENSORS; i++) {
		var theta = -0.5 * Math.PI + Math.PI * (i / (NUM_SENSORS - 1));
		var w = 0.1 + Math.cos(theta);
		var t = 1.0 / car.sensors[i];
		if (t > 5.0) {
			t = 5.0;
		}
		reward -= w * t;
	}
	
	if (car.did_collide) {
		reward -= 500.0;
	} else {
		reward += 5.0;
	}
			
	var state = 0;
	for (var i = 0; i < NUM_SENSORS / N0; i++) {
		state *= 2;
		var any = false;
		for (var j = 0; j < N0; j++) {
			if (car.sensors[i * N0 + j] < DIST_1) {
				any = true;
			}
		}
		if (any) {
			state += 1;
		}
	}
	for (var i = 0; i < NUM_SENSORS / N1; i++) {
		state *= 2;
		var any = false;
		for (var j = 0; j < N1; j++) {
			if (car.sensors[i * N1 + j] < DIST_2) {
				any = true;
			}
		}
		if (any) {
			state += 1;
		}
	}	
	
	return {state: state, reward: reward};
};

var Q = [];
for (var i = 0; i < 3 * (1 << (N0 + N1)); i++) {
	Q[i] = 0.0;
}

var get_action = function(state_index, epsilon) {
	var r = Math.random();
	if(r < epsilon) {
		return Math.floor(3 * Math.random());
	} else {
		var max_action = 0;
		for (var action = 0; action < 3; action++) {
			if (Q[3 * state_index + action] > Q[3 * state_index + max_action]) {
				max_action = action;
			}
		}
		return max_action;
	}
};

var update_value = function(state_index, action, state_index_next, action_next, reward) {
	var i = 3 * state_index + action;
	var i_next = 3 * state_index_next + action_next;
	if (i < 0 || i >= Q.length || i_next < 0 || i_next >= Q.length) {
		console.log(state_index, action, state_index_next, action_next);
	}
	Q[i] = Q[i] + 0.5 * (reward + Q[i_next] - Q[i]);
};

/*
document.addEventListener('keydown', (event) => {
	var A = 0.0;
	
	if (event.keyCode == 37) {
		// LEFT
		car.tire_heading = -0.5;
	}
	if (event.keyCode == 38) {
		// UP
		car.acceleration = 1.0;
	}
	if (event.keyCode == 39) {
		// RIGHT
		car.tire_heading = 0.5;
	}
	if (event.keyCode == 40) {
		// DOWN
		car.acceleration = -1.0;
	}
});

document.addEventListener('keyup', (event) => {
	if (event.keyCode == 37) {
		// LEFT
		car.tire_heading = 0.0;
	}
	if (event.keyCode == 38) {
		// UP
		car.acceleration = 0.0;
	}
	if (event.keyCode == 39) {
		// RIGHT
		car.tire_heading = 0.0;
	}
	if (event.keyCode == 40) {
		// DOWN
		car.acceleration = 0.0;
	}
});
*/

canvas.onclick = function(e) {
	var x = e.offsetX / canvas.width * 20 - 10;
	var y = (canvas.width - e.offsetY) / canvas.width * 20 - 10;
	obstacles.push(new Obstacle({x: x, y: y}, 1.0));
};

var do_action = function(action) {
	var TURN_A = 2.0;

	if (action == 0) {
		car.tire_heading = 0.0;
	} else if (action == 1) {
		car.tire_heading = TURN_A;
	} else if (action == 2) {
		car.tire_heading = -TURN_A;
	} else {
		console.log(action);
	}
};

var state_and_reward = get_state_and_reward();	
var action = get_action(state_and_reward.state, 0.1);

for (var i = 0; i < 0; i++) {
	do_action(action);
	car.update(0.016);

	var state_and_reward_next = get_state_and_reward();
	var action_next = get_action(state_and_reward_next.state, 0.1);
	update_value(state_and_reward.state, 
					action, 
					state_and_reward_next.state, 
					action_next,
					state_and_reward_next.reward);
			
	state_and_reward = state_and_reward_next;
	action = action_next;
}

var time_since_collision = 0;
var last_render = 0;
var time_since_collision_div = document.getElementById('timesincecollision');
var speed_input = document.getElementById('speed');
var randomness_input = document.getElementById('randomness');
var clear_obstacles_button = document.getElementById('clearobstacles');

var epsilon = 0.0;
var speed = 10;

randomness_input.value = epsilon.toFixed(1);
speed_input.value = speed;

randomness_input.onchange = function(e) {
	var val = Number.parseFloat(randomness_input.value);
	epsilon = val;
};

speed_input.onchange = function(e) {
	var val = Number.parseFloat(speed_input.value);
	speed = val;
};

clear_obstacles_button.onclick = function(e) {
	obstacles.length = 0;
};

var episode_ended = false;

var loop = function(timestamp) {
	var progress = timestamp - last_render;
	last_render = timestamp;
	
	for (var times = 0; times < speed; times++) {
		do_action(action);
		car.update(0.016);

		var state_and_reward_next = get_state_and_reward();
		var action_next = get_action(state_and_reward_next.state, epsilon);
		
		if (episode_ended) {
			episode_ended = false;
		} else {
			update_value(state_and_reward.state, 
							action, 
							state_and_reward_next.state, 
							action_next,
							state_and_reward_next.reward);			
		}						

		state_and_reward = state_and_reward_next;
		action = action_next;
		
		if (car.did_collide) {
			episode_ended = true;
			time_since_collision = 0;
		}
	}
	
	time_since_collision += speed * progress;
	time_since_collision_div.innerHTML = "Time since collision: " + (time_since_collision / 1000.0).toFixed(1);
		
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	car.draw();
	for (var i = 0; i < obstacles.length; i++) {
		obstacles[i].draw();
	}
		
	window.requestAnimationFrame(loop);
};

window.requestAnimationFrame(loop);