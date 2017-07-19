(function(w){
    var ID = 0;
    /**
     *
     * @param bounds
     * @param max_objects
     * @param max_levels
     * @param level
     * @param parent
     * @constructor
     */
    var QuadTree = function(bounds, max_objects, max_levels,level,parent) {
        var self = this;
        self.bounds = bounds;
        max_objects = parseInt(max_objects);
        max_levels = parseInt(max_levels);
        level = parseInt(level);

        self.max_objects = isNaN(max_objects) ? 10:max_objects;
        self.max_levels = isNaN(max_levels) ? 4:max_levels;
        self.level = isNaN(level) ? 0:level;
        self.nodes = [];
        self.objects = [];
        self.groups = [];
        self.qtd = 0;
        self.parent = parent === undefined?null:parent;
    };


    QuadTree.prototype.clear = function () {
        var self = this;

        self.objects.forEach(function(obj){
            if(obj.parents[self.level]){
                var index = obj.parents[self.level].indexOf(self);
                if(index != -1){
                    obj.parents[self.level].splice(index,1);
                }
            }
        });

        self.objects = [];
        self.groups = [];
        self.qtd = 0;
        var i;
        var length = self.nodes.length;

        for(i = 0; i < length;i++){
            self.nodes[i].clear();
        }
    };

    /**
     *
     * @param bounds
     */
    QuadTree.prototype.insert = function (bounds) {
        var self = this;

        if(bounds.id === undefined){
            bounds.id = ID;
            ID++;
        }

        if(bounds.groups === undefined){
            bounds.groups = ['default'];
        }

        var length = bounds.groups.length;
        var i;

        for(i =0; i < length;i++){
            var group = bounds.groups[i];
            if(self.groups[group] === undefined){
                self.groups[group] = [];
            }
            self.groups[group][bounds.id] = bounds;
        }

        self.objects[bounds.id] = bounds;

        if(bounds.parents == undefined){
            bounds.parents = [];
        }
        if(bounds.parents[self.level] == undefined){
            bounds.parents[self.level] = [];
        }
        var index = bounds.parents[self.level].indexOf(self);
        if(index == -1){
            bounds.parents[self.level].push(self);
        }

        self.qtd++;

        if(self.qtd > self.max_objects && self.level < self.max_levels) {
            if(self.nodes.length == 0){
                self.split();
            }
            for (i = 0; i < 4; i++) {
                if (overlap(bounds, self.nodes[i].bounds)) {
                    self.nodes[i].insert(bounds);
                }
            }
        }
    };

    /**
     *
     * @returns {boolean}
     */
    QuadTree.prototype.isLeaf = function(){
        var self = this;
        return self.qtd <= self.max_objects;
    };


    QuadTree.prototype.split = function () {
        var self = this;
        var level = self.level + 1;

        var x = self.bounds.x;
        var y = self.bounds.y;

        var width = self.bounds.width/2;
        var height = self.bounds.height/2;
        var x2 = x+width;
        var y2 = y+height;

        self.nodes[0] = new QuadTree({
            x:x,
            y:y,
            width:width,
            height:height
        }, self.max_objects,self.max_levels,level,self);

        self.nodes[1] = new QuadTree({
            x:x2,
            y:y,
            width:width,
            height:height
        }, self.max_objects,self.max_levels,level,self);

        self.nodes[2] = new QuadTree({
            x:x2,
            y:y2,
            width:width,
            height:height
        }, self.max_objects,self.max_levels,level,self);

        self.nodes[3] = new QuadTree({
            x:x,
            y:y2,
            width:width,
            height:height
        }, self.max_objects,self.max_levels,level,self);

        self.objects.forEach(function (object) {
            for (var j = 0; j < 4; j++) {
                if (overlap(object, self.nodes[j].bounds)) {
                    self.nodes[j].insert(object);
                }
            }
        });
    };

    /**
     *
     * @param bounds
     */
    QuadTree.prototype.remove = function(bounds){
        QuadTree.remove(bounds);
    };

    /**
     *
     * @param group
     */
    QuadTree.prototype.removeGroup = function(group){
        var self = this;
        if(self.groups[group] != undefined){
            delete self.groups[group];
        }

        self.objects.forEach(function(obj,id){
            if(obj.groups.indexOf(group) != -1){
                delete self.objects[id];
            }
        });
        var length = self.nodes.length;
        for(var i =0; i < length;i++){
            self.nodes[i].removeGroup(group);
        }
    };

    /**
     *
     * @param bounds
     * @param group
     */
    QuadTree.removeGroup = function(bounds,group){
        var index = bounds.groups.indexOf(group);
        if(index != -1){
            bounds.groups.splice(index,1);
        }

        var length1 = bounds.parents;
        var length2;
        var i;
        var j;
        var parents;
        var parent;


        for(i = 0; i < length1;i++){
            parents = bounds.parents[i];
            length2 = parents.length;
            for(j = 0;j < length2;j++){
                parent = parents[j];
                if(parent.groups[group] != undefined){
                    delete parent.groups[group][bounds.id];
                }
            }
        }
    };

    /**
     *
     * @param bounds
     * @param group
     */
    QuadTree.addGroup = function(bounds,group){
        if(bounds.groups.indexOf(group) == -1){
            bounds.groups.push(group);
        }

        var length1 =  bounds.parents.length;
        var length2;
        var i;
        var j;
        var parents;
        var parent;

        for(i = 0; i < length1;i++){
            parents = bounds.parents[i];
            length2 = parents.length;
            for(j = 0; j < length2;j++){
                parent = parents[j];
                if(parent.groups[group] == undefined){
                    parent.groups[group] = [];
                }
                parent.groups[group][bounds.id] = bounds;
            }
        }
    };


    /**
     *
     * @param bounds
     */
    QuadTree.remove = function (bounds) {
        var length1 =  bounds.parents.length;
        var length2;
        var length3;
        var parents;
        var i;
        var j;
        var parent;
        var k;
        var group;

        for(i =0; i < length1;i++){
            parents = bounds.parents[i];
            length2 = parents.length;
            for(j = 0; j < length2;j++){
                parent = parents[j];
                delete parent.objects[bounds.id];
                length3 = bounds.groups.length;
                for (k = 0; k < length3; k++) {
                    group = bounds.groups[k];
                    if(parent.groups[group] != undefined){
                        delete parent.groups[group][bounds.id];
                    }
                }
                parent.qtd--;
                if(parent.qtd <= parent.max_objects && parent.nodes.length > 0){
                    parent.nodes = [];
                }
            }
        }
        bounds.parents = [];
    };

    /**
     *
     * @param bounds
     */
    QuadTree.reInsert = function(bounds){
        if(bounds.parents.length > 0){
            var parent = bounds.parents[0][0];
            while(parent.parent instanceof QuadTree){
                parent = parent.parent;
            }
            parent.remove(bounds);
            parent.insert(bounds);
        }
    };

    /**
     *
     * @param bounds
     * @param group
     * @returns {*}
     */
    QuadTree.prototype.retrieve = function(bounds,group){
        var self = this;
        self.insert(bounds);
        var colisions = QuadTree.getCollisions(bounds,group);
        self.remove(bounds);
        return colisions;
    };

    /**
     *
     * @param bounds
     * @param group
     * @returns {Array}
     */
    QuadTree.getCollisions = function(bounds,group){
        var si = bounds.parents.length-1;
        var i;
        var j;
        var colisions = [];
        var found = [];
        var length;
        var parent;

        for(i =  si; i >= 0;i--){
            length = bounds.parents[i].length;
            for(j = 0; j < length;j++){
                parent = bounds.parents[i][j];
                if(parent.isLeaf()){
                    if(group === undefined){
                        parent.objects.forEach(function(object,id){
                            if(id !== bounds.id  && found[object.id] == undefined && overlap(object,bounds)){
                                found[object.id] = true;
                                colisions.push(object);
                            }
                        });
                    }
                    else if(parent.groups[group] !== undefined){
                        parent.groups[group].forEach(function(object,id){
                            if(id !== bounds.id && found[object.id] === undefined && overlap(object,bounds)){
                                found[object.id] = true;
                                colisions.push(object);
                            }
                        });
                    }
                }
            }
        }

        return colisions;
    };

    /**
     *
     * @param groupsA
     * @param groupsB
     * @returns {boolean}
     */
    function compare_groups(groupsA,groupsB){
        var sizeA = groupsA.length;
        var sizeB = groupsB.length;
        for(var i = 0; i < sizeA;i++){
            for(var j =0; j < sizeB;j++){
                if(groupsA[i] == groupsB[j]){
                    return true;
                }
            }
        }

        return false;
    }

    /**
     *
     * @param a
     * @param b
     * @returns {boolean}
     */
    function overlap(a,b){
        if((a.x + a.width) <= b.x){
            return false;
        }
        else if((b.x + b.width) <= a.x){
            return false;
        }
        else if((a.y+ a.height) <= b.y){
            return false;
        }
        else if((b.y+b.height) <= a.y){
            return false;
        }
        return true;
    }



    w.QuadTree = QuadTree;
})(window);

