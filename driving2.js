var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.autoClear = false;
renderer.setSize(1280, 720);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

var carPathScene = new THREE.Scene();
var carPathCamera =
    new THREE.OrthographicCamera(-20.0, 20.0, 10.0, -10.0, -10.0, 10.0);
var carPathTexture = new THREE.WebGLRenderTarget(
    2048.0, 1024.0,
    {minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});

var emptyScene = new THREE.Scene();

var mtlLoader = new THREE.MTLLoader();

var objLoader = new THREE.OBJLoader();

var loadModel = function(name, castShadow, receiveShadow) {
	var materials = mtlLoader.parse(mtlStrings[name]);
	objLoader.setMaterials(materials);
	var model = objLoader.parse(objStrings[name]);
	for (var i = 0; i < model.children.length; i++) {
		model.children[i].geometry.rotateX(0.5 * Math.PI);
		model.children[i].geometry.rotateZ(-0.5 * Math.PI);
		model.children[i].castShadow = castShadow;
		model.children[i].receiveShadow = receiveShadow;
	}
	model.castShadow = castShadow;
	model.receiveShadow = receiveShadow;
	model.scale.x = 0.2;
	model.scale.y = 0.2;
	model.scale.z = 0.2;
	model.side = THREE.DoubleSide;
	return model;
};

var rock1Model = loadModel('rock1', true, true);
var rockSmallModel = loadModel('rockSmall', true, true);
var carModel = loadModel('car', true, true);
var cliffModel = loadModel('cliffBrown', true, true);
var grassModel = loadModel('grass', true, true);
var cliffBrownTopModel = loadModel('cliffBrownTop', false, true);
var cliffBrownWaterfallTopModel = loadModel('cliffBrownWaterfallTop', false, true);
var cliffBrownCornerTopModel = loadModel('cliffBrownCornerTop', false, true);
var cliffBrownCornerInnerTopModel = loadModel('cliffBrownCornerInnerTop', false, true);
var groundDirtModel = loadModel('groundDirt', true, true);
var groundDirtRiverModel = loadModel('groundDirtRiver', true, true);
var groundDirtRiverCornerModel = loadModel('groundDirtRiverCorner', true, true);
var fenceModel = loadModel('fence', true, true);

var stoneSmallModels = [];
for (var i = 1; i < 10; i++) {
	var str = 'stoneSmall' + i;
	stoneSmallModels[i - 1] = loadModel(str, true, true);
}

var scene = new THREE.Scene();

var ambientLight = new THREE.AmbientLight(0x555555);
scene.add(ambientLight);

var shadowLight = new THREE.DirectionalLight(0xffffff, 0.1);
shadowLight.position.set(10.0, -10.0, 15.0);
shadowLight.castShadow = true;
shadowLight.shadow.camera.near = 1.0;
shadowLight.shadow.camera.far = 50.0;
shadowLight.shadow.camera.right = 30.0;
shadowLight.shadow.camera.left = -30.0;
shadowLight.shadow.camera.top = 30.0;
shadowLight.shadow.camera.bottom = -30.0;
shadowLight.shadow.mapSize.width = 2048;
shadowLight.shadow.mapSize.height = 2048;
scene.add(shadowLight);

var directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight1.position.set(-10.0, 200.0, 115.0);
directionalLight1.target.position.set(0.0, 0.0, 0.0);
scene.add(directionalLight1);

var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight2.position.set(10.0, -200.0, 115.0);
directionalLight2.target.position.set(0.0, 0.0, 0.0);
scene.add(directionalLight2);

var camera = new THREE.PerspectiveCamera(
    75, 1280 / 720, 0.1, 1000);
camera.position.y = 10.0;
camera.position.z = 20.0;
camera.up.x = 0.0;
camera.up.y = 0.0;
camera.up.z = 1.0;
camera.lookAt(0.0, 2.7, 0.0);
camera.updateProjectionMatrix();

var NUM_SENSORS = 20;
var DIST_1 = 5.0;
var DIST_2 = 2.5;
var N0 = 2;
var N1 = 2;

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

    // return {x: ro.x + rd.x * t, y: ro.y + rd.y * t};
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

    var geometry = new THREE.CylinderGeometry(radius, radius, 5.0, 32);
    var material = new THREE.MeshLambertMaterial(
        {color: 0xffff00, transparent: true, opacity: 0.7});
    var cylinder = new THREE.Mesh(geometry, material);
    cylinder.setRotationFromAxisAngle(
        new THREE.Vector3(1.0, 0.0, 0.0), 0.5 * Math.PI);
    cylinder.position.x = position.x;
    cylinder.position.y = position.y;
    // scene.add(cylinder);
	
	var i = Math.floor(Math.random() * 9);
	while (i == 6 || i == 7) {
		i = Math.floor(Math.random() * 9);
	}

    var model = stoneSmallModels[5].clone();
    model.position.x = position.x;
    model.position.y = position.y;
    model.scale.x = radius * 0.6;
    model.scale.y = radius * 0.6;
    model.scale.z = radius * 0.6;
    model.rotateZ(Math.random() * 2.0 * Math.PI);
	model.castShadow = true;
	model.receiveShadow = true;
    scene.add(model);
};

var obstacles = [];

for (var i = 1; i < 4; i++) {
    obstacles.push(new Obstacle({x: 5.0, y: (i - 2) * 5.0}, 1.0));
    obstacles.push(new Obstacle({x: -5.0, y: (i - 2) * 5.0}, 1.0));
    obstacles.push(new Obstacle({x: 15.0, y: (i - 2) * 5.0}, 1.0));
    obstacles.push(new Obstacle({x: -15.0, y: (i - 2) * 5.0}, 1.0));
}

obstacles.push(new Obstacle({x: 0.0, y: 3.0}, 1.0));
obstacles.push(new Obstacle({x: 0.0, y: -3.0}, 1.0));
obstacles.push(new Obstacle({x: 0.0, y: 8.0}, 1.0));
obstacles.push(new Obstacle({x: 0.0, y: -8.0}, 1.0));

obstacles.push(new Obstacle({x: 10.0, y: 3.0}, 1.0));
obstacles.push(new Obstacle({x: 10.0, y: -3.0}, 1.0));
obstacles.push(new Obstacle({x: 10.0, y: 8.0}, 1.0));
obstacles.push(new Obstacle({x: 10.0, y: -8.0}, 1.0));

obstacles.push(new Obstacle({x: -10.0, y: 3.0}, 1.0));
obstacles.push(new Obstacle({x: -10.0, y: -3.0}, 1.0));
obstacles.push(new Obstacle({x: -10.0, y: 8.0}, 1.0));
obstacles.push(new Obstacle({x: -10.0, y: -8.0}, 1.0));

var Car = function() {
    var me = this;

    me.acceleration = 0.0;
    me.velocity = 2.0;
    me.heading = 0.0;
    me.tire_heading = 0.0;
    me.stear_direction = 0.0;
    me.position = {x: 0.0, y: 0.0};
    me.did_collide = false;
    me.sensors = [];
    for (var i = 0; i < NUM_SENSORS; i++) {
        me.sensors[i] = DIST_1;
    }

    var model = carModel.clone();
    for (var i = 0; i < model.children.length; i++) {
        model.children[i].scale.x = 0.4;
        model.children[i].scale.y = 0.4;
        model.children[i].scale.z = 0.4;
        model.children[i].position.x = -0.2;
    }
	model.castShadow = true;
	model.receiveShadow = true;

    var carPathGeometry = new THREE.BoxGeometry(2.3, 1.3, 1.0);
    var carPathMaterial = new THREE.MeshBasicMaterial({color: 0x888888});
    var carPathCube = new THREE.Mesh(carPathGeometry, carPathMaterial);

    var carPathBorderGeometry = new THREE.BoxGeometry(2.6, 1.6, 0.8);
    var carPathBorderMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
    var carPathBorderCube =
        new THREE.Mesh(carPathBorderGeometry, carPathBorderMaterial);

    var carPathCenterGeometry = new THREE.BoxGeometry(2.3, 0.2, 1.2);
    var carPathCenterMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
    var carPathCenterCube =
        new THREE.Mesh(carPathCenterGeometry, carPathCenterMaterial);

    carPathScene.add(carPathCube);
    carPathScene.add(carPathBorderCube);
    // carPathScene.add(carPathCenterCube);
    scene.add(model);

    me.update = function(dt) {
        carPathCube.position.x = me.position.x;
        carPathCube.position.y = me.position.y;
        carPathCube.setRotationFromAxisAngle(
            new THREE.Vector3(0.0, 0.0, 1.0), me.heading);

        carPathBorderCube.position.x = me.position.x;
        carPathBorderCube.position.y = me.position.y;
        carPathBorderCube.setRotationFromAxisAngle(
            new THREE.Vector3(0.0, 0.0, 1.0), me.heading);

        carPathCenterCube.position.x = me.position.x;
        carPathCenterCube.position.y = me.position.y;
        carPathCenterCube.setRotationFromAxisAngle(
            new THREE.Vector3(0.0, 0.0, 1.0), me.heading);

        model.position.x = me.position.x;
        model.position.y = me.position.y;
        model.setRotationFromAxisAngle(
            new THREE.Vector3(0.0, 0.0, 1.0), me.heading);

        if (me.did_collide) {
            me.did_collide = false;
			
            me.position.x = 0.0;
            me.position.y = 0.0;
            me.heading = 0.0;
            me.tire_heading = 0.0;
			
			me.position.x = -20.0 + 40.0 * Math.random();
			me.position.y = -10.0 + 20.0 * Math.random();
			me.heading = 2.0 * Math.PI * Math.random();
        }

        me.tire_heading = 0.5 * me.stear_direction;

        /*
        var wanted_tire_heading = me.stear_direction * 0.5;
        if (me.tire_heading < wanted_tire_heading) {
            me.tire_heading += 2.0 * dt;
            if (me.tire_heading > wanted_tire_heading) {
                me.tire_heading = wanted_tire_heading;
            }
        }

        if (me.tire_heading > wanted_tire_heading) {
            me.tire_heading -= 2.0 * dt;
            if (me.tire_heading < wanted_tire_heading) {
                me.tire_heading = wanted_tire_heading;
            }
        }
        */

        // me.velocity = me.velocity + me.acceleration * dt;
        me.position.x = me.position.x + me.velocity * Math.cos(me.heading) * dt;
        me.position.y = me.position.y + me.velocity * Math.sin(me.heading) * dt;

        var angle = me.velocity * Math.sin(me.tire_heading) * dt;
        me.heading += angle;
        while (me.heading <= -Math.PI) me.heading += 2.0 * Math.PI;
        while (me.heading > Math.PI) me.heading -= 2.0 * Math.PI;

        var car_pts = me.get_points();
        for (var i = 0; i < 4; i++) {
            if (car_pts[i].x < -20.0 || car_pts[i].y < -10.0 ||
                car_pts[i].x > 20.0 || car_pts[i].y > 10.0) {
                me.did_collide = true;
            }
        }

        var car_line_segments =
            [
              [car_pts[0], car_pts[1]], [car_pts[1], car_pts[2]],
              [car_pts[2], car_pts[3]], [car_pts[3], car_pts[0]]
            ]

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

            var theta = -0.5 * Math.PI + Math.PI * (i / (NUM_SENSORS - 1)) +
                car.heading;

            var ro = {x: car.position.x, y: car.position.y};
            var rd = {x: Math.cos(theta), y: Math.sin(theta)};

            if (rd.x != 0.0) {
                var dist1 = (-20.0 - ro.x) / rd.x;
                if (dist1 > 0.0 && dist1 < me.sensors[i]) {
                    me.sensors[i] = dist1;
                }

                var dist2 = (20.0 - ro.x) / rd.x;
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
                var dist = ray_circle_closest_intersection(
                    ro, rd, obstacles[j].position, obstacles[j].radius);
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
    //state *= 20;
    //state += 20 * Math.floor((car.tire_heading + 2.0) / 4.0);

    return {state: state, reward: reward};
};

var Q = [];
for (var i = 0; i < 3 * (1 << ((NUM_SENSORS / N0) + (NUM_SENSORS / N1))); i++) {
    Q[i] = 0.0;
}

var get_action = function(state_index, epsilon) {
    var r = Math.random();
    if (r < epsilon) {
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

var update_value = function(
    state_index, action, state_index_next, action_next, reward) {
    var i = 3 * state_index + action;
    var i_next = 3 * state_index_next + action_next;
    if (i < 0 || i >= Q.length || i_next < 0 || i_next >= Q.length) {
        console.log(state_index, action, state_index_next, action_next);
    }
    Q[i] = Q[i] + 0.5 * (reward + Q[i_next] - Q[i]);
};

var do_action = function(action) {
    if (action == 0) {
        car.stear_direction = 0.0;
    } else if (action == 1) {
        car.stear_direction = 1.0;
    } else if (action == 2) {
        car.stear_direction = -1.0;
    } else {
        console.log(action);
    }
};

var grassModels = [];
for (var i = 0; i < 200; i++) {
    var model = grassModel.clone();
    model.position.x = -11.0 + 22.0 * Math.random();
    model.position.y = -11.0 + 22.0 * Math.random();
	model.scale.x = 0.5;
	model.scale.y = 0.5;
	model.scale.z = 0.5;
    model.rotateZ(Math.random() * 2.0 * Math.PI);
    //scene.add(model);
	grassModels.push(model);
}

for (var i = 0; i < 10; i++) {
	var model = null;

	// RIGHT
	if (i == 6) {
		model = groundDirtRiverModel.clone();
		model.rotateOnWorldAxis(new THREE.Vector3(0.0, 0.0, 1.0), -0.5 * Math.PI);
	} else if (i == 5 || i == 7) {
		model = groundDirtRiverCornerModel.clone();
		model.rotateOnWorldAxis(new THREE.Vector3(0.0, 0.0, 1.0), -0.5 * Math.PI);
	} else {
		model = groundDirtModel.clone();
	}	
	model.position.x = 20.0;
	model.position.y = -8.0 + 2.0 * i;
	model.position.z = -0.5;
	if (i == 5 || i == 6 || i == 7) {
		model.position.x += 2.0;
	}
	if (i == 7) {
		model.position.y -= 2.0;
		model.rotateOnWorldAxis(new THREE.Vector3(0.0, 0.0, 1.0), -0.5 * Math.PI);
	}
	scene.add(model);
	
	// LEFT
	model = groundDirtModel.clone();
	model.position.x = -22.0;
	model.position.y = -8.0 + 2.0 * i;
	model.position.z = -0.5;
	scene.add(model);
}

for (var i = 0; i < 20; i++) {
	// TOP
	if (i == 8) {
		model = groundDirtRiverModel.clone();
	} else if (i == 7 || i == 9) {
		model = groundDirtRiverCornerModel.clone();
	} else {
		model = groundDirtModel.clone();
	}
	model.position.x = -20.0 + 2.0 * i;
	model.position.y = 12.0;
	model.position.z = -0.5;
	if (i == 7) {
		model.position.x += 2.0;
		model.rotateOnWorldAxis(new THREE.Vector3(0.0, 0.0, 1.0), -0.5 * Math.PI);
	}
	scene.add(model);
	
	// BOTTOM
	model = groundDirtModel.clone();
	model.position.x = -20.0 + 2.0 * i;
	model.position.y = -10.0;
	model.position.z = -0.5;
	scene.add(model);
}

for (var i = 0; i < 10; i++) {
	var model = null;
	
	// RIGHT
	if (i == 6) {
		model = cliffBrownWaterfallTopModel.clone();
		model.position.x = 22.0;
		model.position.y = -10.0 + 2.0 * i;
		model.rotateZ(Math.PI);
		scene.add(model);
	} else {
		model = cliffBrownTopModel.clone();
		model.position.x = 22.0;
		model.position.y = -10.0 + 2.0 * i;
		model.rotateZ(Math.PI);
		scene.add(model);
	}
	
	// LEFT
	model = cliffBrownTopModel.clone();
	model.position.x = -22.0;
	model.position.y = -8.0 + 2.0 * i;
	model.rotateZ(0.0);
	scene.add(model);
}

for (var i = 0; i < 20; i++) {
	// TOP
	if (i == 8) {
		model = cliffBrownWaterfallTopModel.clone();
		model.position.x = -18.0 + 2.0 * i;
		model.position.y = 12.0;
		model.rotateZ(-0.5 * Math.PI);
		scene.add(model);
	} else {
		model = cliffBrownTopModel.clone();
		model.position.x = -18.0 + 2.0 * i;
		model.position.y = 12.0;
		model.rotateZ(-0.5 * Math.PI);
		scene.add(model);
	}
	
	// BOTTOM
	model = cliffBrownTopModel.clone();
	model.position.x = -20.0 + 2.0 * i;
	model.position.y = -12.0;
	model.rotateZ(0.5 * Math.PI);
	scene.add(model);
}

{
	var model = null;
	
	model = cliffBrownCornerInnerTopModel.clone();
	model.position.x = -22.0;
	model.position.y = 12.0;
	scene.add(model);
	
	model = groundDirtModel.clone();
	model.position.x = -22.0;
	model.position.y = 12.0;
	model.position.z = -0.5;
	scene.add(model);
	
	model = cliffBrownCornerInnerTopModel.clone();
	model.position.x = 22.0;
	model.position.y = 12.0;
	model.rotateZ(-0.5 * Math.PI);
	scene.add(model);
	
	model = groundDirtModel.clone();
	model.position.x = 20.0;
	model.position.y = 12.0;
	model.position.z = -0.5;
	scene.add(model);
	
	model = cliffBrownCornerInnerTopModel.clone();
	model.position.x = -22.0;
	model.position.y = -12.0;
	model.rotateZ(0.5 * Math.PI);
	scene.add(model);
	
	model = groundDirtModel.clone();
	model.position.x = -22.0;
	model.position.y = -10.0;
	model.position.z = -0.5;
	scene.add(model);
	
	model = cliffBrownCornerInnerTopModel.clone();
	model.position.x = 22.0;
	model.position.y = -12.0;
	model.rotateZ(Math.PI);
	scene.add(model);
	
	model = groundDirtModel.clone();
	model.position.x = 20.0;
	model.position.y = -10.0;
	model.position.z = -0.5;
	scene.add(model);
}

for (var i = 0; i < 13; i++) {
	var model = null;
	
	// RIGHT
	if (i > 8) {
		model = groundDirtRiverModel.clone();
		model.rotateZ(0.5 * Math.PI);
		model.position.y -= 2.0;
	} else if (i == 8) {
		model = groundDirtRiverCornerModel.clone();
	} else {
		model = groundDirtModel.clone();
	}
	model.position.x += 22.0;
	model.position.y += -12.0 + 2.0 * i;
	model.position.z += 1.5;
	scene.add(model);
	
	// LEFT
	model = groundDirtModel.clone();
	model.position.x += -24.0;
	model.position.y += -10.0 + 2.0 * i;
	model.position.z += 1.5;
	scene.add(model);
}

for (var i = 0; i < 23; i++) {
	// TOP
	if (i > 9 && i < 22) {
		model = groundDirtRiverModel.clone();
	} else if (i == 9) {
		model = groundDirtRiverCornerModel.clone();
		model.rotateZ(Math.PI);
		model.position.x += 2.0;
		model.position.y -= 2.0;
	} else if (i == 22) {
		model = groundDirtRiverCornerModel.clone();
		model.rotateZ(0.5 * Math.PI);
		model.position.y -= 2.0;
	} else {
		model = groundDirtModel.clone();
	}
	model.position.x += -22.0 + 2.0 * i;
	model.position.y += 14.0;
	model.position.z += 1.5;
	scene.add(model);
	
	// BOTTOM
	model = groundDirtModel.clone();
	model.position.x += -24.0 + 2.0 * i;
	model.position.y -= 12.0;
	model.position.z += 1.5;
	scene.add(model);
}

for (var i = 0; i < 10; i++) {
	var model = null;
	
	// RIGHT
	model = fenceModel.clone();
	model.position.x = 20.0;
	model.position.y = -8.0 + 2.0 * i;
	scene.add(model);
	
	// LEFT
	model = fenceModel.clone();
	model.position.x = -20.0;
	model.position.y = -8.0 + 2.0 * i;
	scene.add(model);
}

for (var i = 0; i < 20; i++) {
	// TOP
	model = fenceModel.clone();
	model.position.x = -20.0 + 2.0 * i;
	model.position.y = 10.0;
	model.rotateZ(0.5 * Math.PI);
	scene.add(model);
	
	// BOTTOM
	model = fenceModel.clone();
	model.position.x = -20.0 + 2.0 * i;
	model.position.y = -10.0;
	model.rotateZ(0.5 * Math.PI);
	scene.add(model);
}

{
    var geometry = new THREE.PlaneGeometry(40.0, 20.0);
    var material = new THREE.MeshPhongMaterial({map: carPathTexture});
	material.specular = new THREE.Color(0.33, 0.33, 0.33);
    var ground = new THREE.Mesh(geometry, material);
	ground.receiveShadow = true;
    scene.add(ground);
}

var raycaster = new THREE.Raycaster();

window.onmouseup = function(e) {
	var mouse = new THREE.Vector2();
	mouse.x = ( event.clientX / 1280 ) * 2 - 1;
	mouse.y = - ( event.clientY / 720 ) * 2 + 1;
	
	raycaster.setFromCamera( mouse, camera );
	
	var intersects = raycaster.intersectObjects( scene.children );
	if (intersects.length > 0) {
		obstacles.push(new Obstacle(intersects[0].point, 1.0));
	}
};

var GUI = function() {
	this.speed = 5.0;
	this.randomness = 0.0;
};

var myGUI = new GUI();
var gui = new dat.GUI();
gui.add(myGUI, 'speed', 1, 1000);
gui.add(myGUI, 'randomness', 0.0, 1.0);

var episode_ended = false;
var state_and_reward = get_state_and_reward();
var action = get_action(state_and_reward.state, 0.0);

function animate() {
    for (var times = 0; times < myGUI.speed; times++) {
        do_action(action);
        car.update(0.016);

        var dont_draw = false;

        var state_and_reward_next = get_state_and_reward();
        var action_next = get_action(state_and_reward_next.state, myGUI.randomness);

        if (episode_ended) {
            dont_draw = true;
            episode_ended = false;
        } else {
            update_value(
                state_and_reward.state, action, state_and_reward_next.state,
                action_next, state_and_reward_next.reward);
        }

        state_and_reward = state_and_reward_next;
        action = action_next;

        if (car.did_collide) {
            dont_draw = true;
            episode_ended = true;
            time_since_collision = 0;
        }

        if (dont_draw) {
            renderer.setClearColor(new THREE.Color(0.35, 0.76, 0.71), 1.0);
            renderer.render(emptyScene, carPathCamera, carPathTexture, true);
        } else {
            renderer.render(carPathScene, carPathCamera, carPathTexture, false);
        }
    }

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

renderer.setClearColor(new THREE.Color(0.35, 0.76, 0.71), 1.0);
renderer.render(emptyScene, carPathCamera, carPathTexture, true);
animate();
