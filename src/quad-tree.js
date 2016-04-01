(function(window){
    var overlap = function(a,b){
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
    };

    var full_inside = function(a,b){
        return a.x >= b.x && a.y >= b.y && (a.x+a.width) <= (b.x+b.width) && (a.y+a.height) <= (b.y+b.height);
    };


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
        self.object_groups = [];
        self.qtd = 0;
        self.parent = parent === undefined?null:parent;
    };

    QuadTree.ID = 0;

    QuadTree.prototype.clear = function () {
        var self = this;
        self.objects = [];
        self.object_groups = [];
        self.qtd = 0;
        var i;
        for(i = 0; i < 4;i++){
            if(self.nodes[i] !== undefined && self.nodes[i].qtd > 0){
                self.nodes[i].clear();
            }
        }
    };

    QuadTree.prototype.insert = function (bounds) {
        var self = this;

        if(bounds._id === undefined){
            bounds._id = QuadTree.ID;
            QuadTree.ID++;
        }


        if(bounds.groups === undefined){
            bounds.groups = ['default'];
        }

        bounds.groups.forEach(function(name){
            if(self.object_groups[name] === undefined){
                self.object_groups[name] = [];
            }
            self.object_groups[name][bounds._id] = bounds;
        });

        self.objects[bounds._id] = bounds;
        self.qtd++;

        if(bounds._full_inside === undefined){
            if(!full_inside(bounds,self.bounds) || self.qtd <= self.max_objects){
                bounds._full_inside = self.parent === null?self:self.parent;
            }

        }

        if(bounds._parents === undefined){
            bounds._parents = [];
        }
        if(bounds._parents[self.level] === undefined){
            bounds._parents[self.level] = [];
        }
        bounds._parents[self.level].push(self);

        //  console.log('size:',size,'max_objects:',self.max_objects,'max level:',self.max_levels,'level:',self.level);
        if(self.qtd > self.max_objects && self.level < self.max_levels){
            if(self.nodes.length === 0){
                self.split();
            }

            if(self.qtd === self.max_objects + 1){
                self.objects.forEach(function(object){
                    for(var j = 0; j < 4;j++){
                        if(overlap(object,self.nodes[j].bounds)){
                            self.nodes[j].insert(object);
                        }
                    }
                });
            }
            else{
                for(var i = 0; i < 4;i++){
                    if(overlap(bounds,self.nodes[i].bounds)){
                        self.nodes[i].insert(bounds);
                    }
                }
            }
        }
    };

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
    };

    QuadTree.prototype.remove = function(bounds){
        var self = this;
        var level = self.level;
        var size1 =  bounds._parents.length;
        for(var i = level; i < size1;i++){
            var parents = bounds._parents[i];
            var size2 =  parents.length;
            for(var j = 0; j < size2;j++){
                delete parents[j].objects[bounds._id];
                var size = bounds.groups.length;
                for(var k = 0; k < size;k++){
                    delete parents[j].object_groups[bounds.groups[k]][bounds._id];
                }
                parents[j].qtd--;
            }
            bounds._parents[i] = [];
        }
    };


    QuadTree.remove = function (bounds) {
        if(bounds !== undefined){
            if(bounds._parents !== undefined){
                var size1 = bounds._parents.length;
                for(var level = 0; level < size1;level++){
                    var parents = bounds._parents[level];
                    var size2 = parents.length;
                    for(var j = 0; j < size2;j++){
                        delete parents[j].objects[bounds._id];
                        var size = bounds.groups.length;
                        for(var k = 0; k < size;k++){
                            delete parents[j].object_groups[bounds.groups[k]][bounds._id];
                        }
                        parents[j].qtd--;
                    }
                    bounds._parents[level] = [];
                }
            }
        }
    };

    QuadTree.reInsert = function(bounds){
        var parent = bounds._full_inside;
        while(parent.parent !== null && parent.parent !== undefined){
            parent = parent.parent;
        }
        parent.remove(bounds);
        parent.insert(bounds);
    };

    QuadTree.prototype.retrieve = function(bounds,group){
        var self = this;
        self.insert(bounds);
        var colisions = QuadTree.getCollisions(bounds,group);
        QuadTree.remove(bounds);
        return colisions;
    };

    QuadTree.getCollisions = function(bounds,group){
        var pos = bounds._parents.length-1;
        var colisions = [];
        if(pos !== undefined){
            var parents = bounds._parents[pos];
            var size = parents.length;
            var found = [];

            for(var  i = 0; i < size;i++){
                if(group === undefined){
                    parents[i].objects.forEach(function(object,id){
                        if(id !== bounds._id && compare_groups(object.groups, bounds.groups) && found[object._id] === undefined && overlap(object,bounds)){
                            found[object._id] = true;
                            colisions.push(object);
                        }
                    });
                }
                else if(parents[i].object_groups[group] !== undefined){
                    parents[i].object_groups[group].forEach(function(object,id){
                        if(id !== bounds._id && found[object._id] === undefined && overlap(object,bounds)){
                            found[object._id] = true;
                            colisions.push(object);
                        }
                    });
                }
            }
        }
        return colisions;
    };

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

    window.QuadTree = QuadTree;
})(window);

