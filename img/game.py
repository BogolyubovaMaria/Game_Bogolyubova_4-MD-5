import arcade
import time


WINDOW_WIDTH = 1280
WINDOW_HEIGHT = 720
WINDOW_TITLE = "Flowalive"


LEVEL_WIDTH = WINDOW_WIDTH * 2


RECORD_FILENAME = "record.txt"


PLAYER_MOVEMENT_SPEED = 5
PLAYER_JUMP_SPEED = 75
PLAYER_START_POSITION_X = 64
PLAYER_START_POSITION_Y = 115

PLAYER_START_HEALTH = 2
PLAYER_START_SCROLLS = 1
PLAYER_MAX_SCROLLS = 2

GRAVITY = -4

SHIELD_DURATION = 10
SHIELD_COOLDOWN_TIME = 1.0

ORANGE_SPHERE_SPEED = 9

ENEMY_ATTACK_COOLDOWN_IN_FRAMES = 140

FIREBALL_SPEED = 5



class Player(arcade.Sprite):
    def __init__(self, texture, health, scrolls, max_scrolls):
        super().__init__(texture)

        
        self.health = health
        
        self.current_scrolls = scrolls
        
        self.maximum_scrolls = max_scrolls

    
    def take_damage(self, amount):
        self.health -= amount
        if self.health < 0:
            self.health = 0

    
    def kill(self):
        self.health = 0

    
    def add_scroll(self, count):
        if self.current_scrolls < self.maximum_scrolls:
            self.current_scrolls += count

    
    def can_cast_spell(self):
        return self.current_scrolls > 0

    
    def is_dead(self):
        return self.health <= 0

    
    def use_scroll(self):
        if self.can_cast_spell():
            self.current_scrolls -= 1
            return True
        return False



class GameView(arcade.Window):

    
    def __init__(self):
        
        super().__init__(WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_TITLE)

        

        self.start_time = 0
        self.current_time = 0
        self.timer_text = None
        self.game_over = False
        self.record_time = 0.0
        self.new_record = False
        self.record_text = None
        self.music = None
        self.player = None

        self.background = None
        self.player_sprite = None
        self.player_jump = False
        self.player_velocity_y = 0
        self.walk_textures = []
        self.idle_texture = None
        self.jump_texture = None
        self.animation_timer = 0 
        self.current_frame = 0 

        self.wall_list = None
        self.poison_flower_list = None

        self.heart_texture = None
        self.scroll_empty_texture = None
        self.scroll_texture = None
        self.scroll_pickup_texture = None
        self.scroll_pickup_list = None

        self.camera = None

        self.key_right_pressed = False
        self.key_left_pressed = False

        self.enemy_texture = None
        self.enemy_list = None
        self.enemy_attack_cooldown = 0

        self.fireball_texture = None
        self.fireball_list = None

        self.shield_texture = None
        self.shield_sprite = None
        self.shield_active = False
        self.shield_cooldown = 0.0
        self.shield_timer = 0.0

        self.orange_sphere_texture = None
        self.orange_sphere_list = None

        self.crown_texture = None
        self.crown_sprite = None

        self.camera_intro_mode = True
        self.camera_intro_phase = ""
        self.camera_intro_speed = 0
        self.camera_intro_target_x = 0
        self.camera_intro_start_x = 0
        self.camera_intro_pause_timer = 0.0
        self.camera_intro_pause_duration = 0.0

    
    def setup(self):
        
        self.current_time = 0
        
        self.timer_text = arcade.Text("Время: 0.0 сек.", 20, WINDOW_HEIGHT - 40, arcade.color.WHITE, 20)
        
        self.record_text = arcade.Text("", 20, WINDOW_HEIGHT - 120, arcade.color.WILD_STRAWBERRY, 30, multiline=True, width=500)
        
        self.game_over = False
        
        self.record_time = 0.0
        
        self.new_record = False

        
        self.background = arcade.load_texture("background.png")
        self.heart_texture = arcade.load_texture("heart.png")
        self.scroll_empty_texture = arcade.load_texture("scroll_empty.png")
        self.scroll_texture = arcade.load_texture("scroll.png")
        self.scroll_pickup_texture = arcade.load_texture("scroll_pickup.png")

        self.wall_list = arcade.SpriteList()

        
        for x in range(0, 2800, 64):
            wall = arcade.Sprite("block_grass.png", scale=0.5)
            wall.center_x = x
            wall.center_y = 32
            self.wall_list.append(wall)

        self.poison_flower_list = arcade.SpriteList()

        
        coordinate_list = [[512, 96], [256, 96], [768, 96], [980, 96], [1200, 96]]
        for coordinate in coordinate_list:
            poison_flower = arcade.Sprite("tox_flowers.png", scale=0.5)
            poison_flower.position = coordinate
            self.poison_flower_list.append(poison_flower)

        
        coordinate_list2 = [[400, 120], [520, 200], [600, 270], [740, 340], [870, 340], [960, 200], [1080, 300], [1300, 200], [1560, 300]]
        for coordinate2 in coordinate_list2:
            wall = arcade.Sprite("cloud.png", scale=1.0)
            wall.position = coordinate2
            self.wall_list.append(wall)

        
        self.camera = arcade.camera.Camera2D()

        self.key_right_pressed = False
        self.key_left_pressed = False

        
        self.walk_textures = [
            arcade.load_texture("player_walk_0.png"),
            arcade.load_texture("player_walk_1.png"),
            arcade.load_texture("player_walk_2.png")
        ]

        
        self.idle_texture = arcade.load_texture("player_idle.png")
        
        self.jump_texture = arcade.load_texture("player_jump.png")

        
        self.player_sprite = Player(self.idle_texture, PLAYER_START_HEALTH, PLAYER_START_SCROLLS, PLAYER_MAX_SCROLLS)
        
        self.player_sprite.center_x = PLAYER_START_POSITION_X
        self.player_sprite.center_y = PLAYER_START_POSITION_Y
        self.player_jump = False
        self.player_velocity_y = 0

        self.enemy_attack_cooldown = 0
        self.enemy_texture = arcade.load_texture("enemy.png")
        self.enemy_list = arcade.SpriteList()

        
        coordinate_list3 = [[2000, 200]]
        for coordinate3 in coordinate_list3:
            enemy_sprite = arcade.Sprite(self.enemy_texture)
            enemy_sprite.position = coordinate3
            self.enemy_list.append(enemy_sprite)

        self.scroll_pickup_list = arcade.SpriteList()

        
        coordinate_list4 = [[600, 290]]
        for coordinate4 in coordinate_list4:
            scroll_pickup_sprite = arcade.Sprite(self.scroll_pickup_texture)
            scroll_pickup_sprite.position = coordinate4
            self.scroll_pickup_list.append(scroll_pickup_sprite)

        self.fireball_texture = arcade.load_texture("fireball.png")
        self.fireball_list = arcade.SpriteList()

        self.shield_texture = arcade.load_texture("shield.png")
        self.shield_sprite = arcade.Sprite(self.shield_texture)
        self.shield_active = False
        self.shield_cooldown = 0.0  
        self.shield_timer = 0.0  

        self.orange_sphere_texture = arcade.load_texture("orange_sphere.png")
        self.orange_sphere_list = arcade.SpriteList()

        self.crown_texture = arcade.load_texture("crown.png")
        self.crown_sprite = arcade.Sprite(self.crown_texture)
        self.crown_sprite.position = [2200, 100]

        if self.player is not None:
            arcade.stop_sound(self.player)

        self.music = arcade.load_sound("music.mp3")
        self.player = arcade.play_sound(self.music)
        self.player.volume = 0.5  

        self.camera_intro_mode = True  
        self.camera_intro_phase = "right"  
        self.camera_intro_speed = 5  
        self.camera_intro_target_x = LEVEL_WIDTH - WINDOW_WIDTH / 2  
        self.camera_intro_start_x = WINDOW_WIDTH / 2  
        self.camera_intro_pause_timer = 0.0  
        self.camera_intro_pause_duration = 2.0  

    
    def on_draw(self):
        
        self.clear()
        
        arcade.draw_texture_rect(self.background, arcade.LBWH(0, 0, LEVEL_WIDTH, WINDOW_HEIGHT))

        
        self.camera.use()

        
        self.wall_list.draw()
        
        self.poison_flower_list.draw()
        
        arcade.draw_sprite(self.player_sprite)
        
        self.enemy_list.draw()
        
        if self.shield_active:
            arcade.draw_sprite(self.shield_sprite)
        
        self.scroll_pickup_list.draw()
        
        self.fireball_list.draw()
        
        self.orange_sphere_list.draw()
        
        if self.crown_sprite is not None:
            arcade.draw_sprite(self.crown_sprite)

        
        self.render_ui()

    
    def center_camera_to_player(self):
        
        camera_position_x = self.player_sprite.center_x

        
        if camera_position_x < WINDOW_WIDTH / 2:
            
            camera_position_x = WINDOW_WIDTH / 2

        camera_max_position_x = LEVEL_WIDTH - WINDOW_WIDTH / 2

        
        if camera_position_x > camera_max_position_x:
            
            camera_position_x = camera_max_position_x

        
        self.camera.position = camera_position_x, WINDOW_HEIGHT / 2

    
    def player_movement(self):
        
        dx = 0
        dy = 0

        
        if self.key_left_pressed:
            dx = -PLAYER_MOVEMENT_SPEED
        
        if self.key_right_pressed:
            dx = PLAYER_MOVEMENT_SPEED

        
        if self.player_jump:
            self.player_velocity_y = PLAYER_JUMP_SPEED
            self.player_jump = False

        
        self.player_velocity_y += GRAVITY

        
        if self.player_velocity_y < GRAVITY:
            self.player_velocity_y = GRAVITY

        dy = self.player_velocity_y

        
        if dy > 10:
            dy = 10

        
        collision_result_x = False
        collision_result_y = False

    
        for wall in self.wall_list:
            collisions_results = self.calculate_collisions(self.player_sprite, wall, dx, dy)
            collision_result_x = collision_result_x or collisions_results[0]
            collision_result_y = collision_result_y or collisions_results[1]

        
        player_offset = 30

        if dx < 0:
            
            collision_result_x = collision_result_x or self.player_sprite.center_x - player_offset <= 0
        elif dx > 0:
            
            collision_result_x = collision_result_x or self.player_sprite.center_x + player_offset >= LEVEL_WIDTH

        
        if not collision_result_x:
            self.player_sprite.center_x += dx

        
        if not collision_result_y:
            self.player_sprite.center_y += dy

    
    def get_left(self, sprite):
        return sprite.center_x - sprite.width / 2

    
    def get_right(self, sprite):
        return sprite.center_x + sprite.width / 2

    
    def get_bottom(self, sprite):
        return sprite.center_y - sprite.height / 2

    
    def get_top(self, sprite):
        return sprite.center_y + sprite.height / 2

    
    def check_collision(self, target, other, dx, dy):
        if (self.get_right(target) + dx > self.get_left(other) and
                self.get_left(target) + dx < self.get_right(other) and
                self.get_top(target) + dy > self.get_bottom(other) and
                self.get_bottom(target) + dy < self.get_top(other)):
            return True
            
             
            
        return False

    
    def calculate_collisions(self, target, other, dx, dy):
        collision_found_x = False
        collision_found_y = False

        if self.check_collision(target, other, dx, 0):
            collision_found_x = True

        if self.check_collision(target, other, 0, dy):
            collision_found_y = True

        return collision_found_x, collision_found_y

    
    def is_collide(self, target, other):
        collisions_results = self.calculate_collisions(target, other, dx=0, dy=0)
        collision_result_x = collisions_results[0]
        collision_result_y = collisions_results[1]
        return collision_result_x and collision_result_y

    
    def on_update(self, delta_time):
        
        if not self.game_over:

            if self.camera_intro_mode:
                self.update_intro_camera()
                return  

            self.current_time = time.time() - self.start_time

            self.center_camera_to_player()
            self.player_movement()
            self.update_animation(delta_time)
            self.update_shield(delta_time)
            self.enemy_logic()
            self.fireball_logic()
            self.orange_sphere_logic()
            self.scroll_pickup_logic()
            self.crown_pickup_logic()
            self.poison_flower_logic()

            
            if self.player_sprite.is_dead():
                self.setup()

    
    def update_animation(self, delta_time):
        is_moving = self.key_left_pressed or self.key_right_pressed
        is_on_ground = self.is_on_ground()

        if not is_on_ground:
            self.player_sprite.texture = self.jump_texture
        elif is_moving:
            self.animation_timer += delta_time
            
            if self.animation_timer > 0.15:
                self.animation_timer = 0
                self.current_frame += 1
                
                if self.current_frame >= len(self.walk_textures):
                    self.current_frame = 0
                self.player_sprite.texture = self.walk_textures[self.current_frame]
        else:
            self.player_sprite.texture = self.idle_texture
            self.current_frame = 0
            self.animation_timer = 0

    
    def update_shield(self, delta_time):
        
        if self.shield_active:
            
            shield_offset = 60
            self.shield_sprite.center_x = self.player_sprite.center_x + shield_offset
            self.shield_sprite.center_y = self.player_sprite.center_y

            self.shield_timer += delta_time

            
            if self.shield_timer >= SHIELD_DURATION:
                
                self.shield_active = False
                self.shield_timer = 0.0
                self.shield_cooldown = SHIELD_COOLDOWN_TIME
        elif self.shield_cooldown > 0:
            self.shield_cooldown -= delta_time

    
    def render_ui(self):
        
        camera_center_x = self.camera.position[0]
        camera_center_y = self.camera.position[1]

        
        offset_x = camera_center_x - WINDOW_WIDTH / 2
        offset_y = camera_center_y - WINDOW_HEIGHT / 2

        
        self.timer_text.x = offset_x + WINDOW_WIDTH / 2
        self.timer_text.y = offset_y + WINDOW_HEIGHT - 40

        
        for i in range(self.player_sprite.health):
            arcade.draw_texture_rect(self.heart_texture, arcade.LBWH(offset_x + 20 + 64 * i, offset_y + WINDOW_HEIGHT - 64 - 20, 64, 64))
        
        for i in range(self.player_sprite.maximum_scrolls):
            arcade.draw_texture_rect(self.scroll_empty_texture, arcade.LBWH(offset_x + WINDOW_WIDTH - 64 - 20 - 64 * i, offset_y + WINDOW_HEIGHT - 64 - 20, 64, 64))
        
        for i in range(self.player_sprite.current_scrolls):
            arcade.draw_texture_rect(self.scroll_texture, arcade.LBWH(offset_x + WINDOW_WIDTH - 64 - 20 - 64 * i, offset_y + WINDOW_HEIGHT - 64 - 20, 64, 64))

        
        self.timer_text.text = f"Время: {self.current_time:.1f} сек."

        
        self.timer_text.draw()

        
        if self.game_over:
            self.record_text.text = "Игра окончена!\n"
            self.record_text.text += f"Время: {self.current_time:.2f} сек.\n"
            self.record_text.text += f"Рекорд: {self.record_time:.2f} сек.\n"
            if self.new_record:
                self.record_text.text += "НОВЫЙ РЕКОРД!"

            
            self.record_text.x = offset_x + WINDOW_WIDTH / 2 - 400
            self.record_text.y = offset_y + WINDOW_HEIGHT / 2
            
            self.record_text.draw()

    
    def is_on_ground(self):
        for wall in self.wall_list:
            
            if self.check_collision(self.player_sprite, wall, 0, -5):
                return True
        return False

    
    def on_key_press(self, key, modifiers):
        
        if not self.game_over and not self.camera_intro_mode:
            
            if key in (arcade.key.UP, arcade.key.W, arcade.key.SPACE):
                if self.is_on_ground():
                    self.player_jump = True

            
            if key in (arcade.key.LEFT, arcade.key.A):
                self.key_left_pressed = True

            
            if key in (arcade.key.RIGHT, arcade.key.D):
                self.key_right_pressed = True

            
            if key == arcade.key.E:
                if not self.shield_active and self.shield_cooldown <= 0:
                    
                    self.shield_active = True
                    self.shield_timer = 0.0

            
            if key == arcade.key.Q:
                
                if self.player_sprite.use_scroll():
                    
                    orange_sphere_offset_right = 60
                    orange_sphere_sprite = arcade.Sprite(self.orange_sphere_texture)
                    orange_sphere_sprite.center_x = self.player_sprite.center_x + orange_sphere_offset_right
                    orange_sphere_sprite.center_y = self.player_sprite.center_y
                    self.orange_sphere_list.append(orange_sphere_sprite)

        
        if key == arcade.key.ESCAPE:
            self.restart_game()

    
    def on_key_release(self, key, modifiers):
        
        if not self.game_over and not self.camera_intro_mode:

            if key in (arcade.key.LEFT, arcade.key.A):
                self.key_left_pressed = False

            if key in (arcade.key.RIGHT, arcade.key.D):
                self.key_right_pressed = False

    
    def restart_game(self):
        self.setup()

    
    def enemy_logic(self):
        self.enemy_attack_cooldown += 1
        if self.enemy_attack_cooldown >= ENEMY_ATTACK_COOLDOWN_IN_FRAMES:
            
            self.enemy_attack_cooldown = 0
            for enemy in self.enemy_list:
                
                fireball_sprite = arcade.Sprite(self.fireball_texture)
                fireball_sprite.center_x = enemy.center_x
                fireball_sprite.center_y = enemy.center_y
                self.fireball_list.append(fireball_sprite)

    
    def fireball_logic(self):
        for fireball in self.fireball_list:
            
            direction_x = self.player_sprite.center_x - fireball.center_x
            direction_y = self.player_sprite.center_y - fireball.center_y

            
            distance = (direction_x ** 2 + direction_y ** 2) ** 0.5
            if distance != 0:
                direction_x /= distance
                direction_y /= distance

            
            fireball.center_x += direction_x * FIREBALL_SPEED
            fireball.center_y += direction_y * FIREBALL_SPEED

            if self.is_collide(self.shield_sprite, fireball):
                if self.shield_active:
                    self.fireball_list.remove(fireball)
            elif self.is_collide(self.player_sprite, fireball):
                self.player_sprite.take_damage(1)
                self.fireball_list.remove(fireball)

    
    def orange_sphere_logic(self):
        for orange_sphere in self.orange_sphere_list:
            
            orange_sphere.center_x += ORANGE_SPHERE_SPEED
            for enemy in self.enemy_list:
                if self.is_collide(enemy, orange_sphere):
                    self.orange_sphere_list.remove(orange_sphere)
                    self.enemy_list.remove(enemy)

    
    def scroll_pickup_logic(self):
        for scroll_pickup in self.scroll_pickup_list:
            if self.is_collide(self.player_sprite, scroll_pickup):
                self.scroll_pickup_list.remove(scroll_pickup)
                self.player_sprite.add_scroll(1)

    
    def check_and_save_record(self):
        time = round(self.current_time, 2)

        try:
            with open(RECORD_FILENAME, "r") as file:
                record_str = file.read().strip()
                record_time = float(record_str)
        except (FileNotFoundError, ValueError):
            record_time = 0.0

        if time < record_time:
            with open(RECORD_FILENAME, "w") as file:
                file.write(str(time))
            self.new_record = True
            self.record_time = time
        else:
            self.new_record = False
            self.record_time = record_time

    
    def crown_pickup_logic(self):
        if self.is_collide(self.player_sprite, self.crown_sprite):
            self.crown_sprite = None
            if not self.game_over:
                self.game_over = True
                self.check_and_save_record()

    
    def poison_flower_logic(self):
        for poison_flower in self.poison_flower_list:
            if self.is_collide(self.player_sprite, poison_flower):
                self.restart_game()

    
    def update_intro_camera(self):
        camera_position_x = self.camera.position[0]
        camera_position_y = self.camera.position[1]

        if self.camera_intro_phase == "right":
            camera_position_x += self.camera_intro_speed
            self.camera.position = (camera_position_x, camera_position_y)
            if camera_position_x >= self.camera_intro_target_x:
                self.camera_intro_phase = "pause"
                self.camera_intro_pause_timer = 0.0
        elif self.camera_intro_phase == "pause":
            self.camera_intro_pause_timer += 1 / 60  
            if self.camera_intro_pause_timer >= self.camera_intro_pause_duration:
                self.camera_intro_phase = "left"
        elif self.camera_intro_phase == "left":
            camera_position_x -= self.camera_intro_speed
            self.camera.position = (camera_position_x, camera_position_y)
            if camera_position_x <= self.camera_intro_start_x:
                
                self.camera_intro_mode = False
                
                self.start_time = time.time()



def main():
    window = GameView()
    window.setup()
    arcade.run()


if __name__ == "__main__":
    main()
