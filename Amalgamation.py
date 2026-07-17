# -*- coding: utf-8 -*-
"""
Created on Wed Mar 10 22:32:28 2021

@author: frede
"""
import pygame
import sys
from pygame.locals import *
from QuantumTetris import QuantumTetris
import time

# Set up named colors with rgb
white, lgray, black, red, green = (
    220, 220, 220), (200, 200, 200), (180, 180, 180), (255, 120, 120), (120, 255, 120)

# Set initial and minimum resolution of game window
initialresolution = (900, 900)
min_resolution = (400, 400)


def main():
    # Set up screen
    pygame.init()
    screen = pygame.display.set_mode(
        initialresolution, HWSURFACE | DOUBLEBUF | RESIZABLE)
    gameDisplay = screen.copy()

    pygame.display.set_caption("QuanTris")

    # Size of squares and standard tetris board size
    initial_square_size = 35
    boardHeight = 20
    boardWidth = 10

    difficulty = .7  # Lower is harder

    main_board = Board(boardWidth, boardHeight,
                       initial_square_size,
                       screen.get_rect().size,
                       QuantumTetris(), difficulty)
    run = True
    fast_forward = False
    last_action_time = time.time()

    '''Main Game Loop'''
    while run:
        if fast_forward:
            if time.time() > last_action_time + 0.05:
                main_board.game_state.update()  # call the update function once a second
                last_action_time = time.time()
        elif time.time() > last_action_time + main_board.difficulty:
            main_board.game_state.update()  # call the update function once a second
            last_action_time = time.time()

        points = main_board.game_state.getpoints()

        gameDisplay.fill(white)

        # Get and rescale mouse position onto canvas
        mouse_RAW = pygame.mouse.get_pos()
        mouse = (mouse_RAW[0]*main_board.rescale[1],
                 mouse_RAW[1]*main_board.rescale[0])

        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.VIDEORESIZE:
                main_board.resize((event.w, event.h))
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_x:
                    print('Gate x')
                    main_board.game_state.handle_gate_action('x')
                elif event.key == pygame.K_z:
                    print('Gate z')
                    main_board.game_state.handle_gate_action('z')
                elif event.key == pygame.K_a:
                    print('Gate cz')
                    main_board.game_state.handle_gate_action('cz')
                elif event.key == pygame.K_s:
                    print('Gate cx')
                    main_board.game_state.handle_gate_action('cx')
                elif event.key == pygame.K_h:
                    print('Gate h')
                    main_board.game_state.handle_gate_action('h')
                elif event.key == pygame.K_LEFT:
                    print('move left')
                    main_board.game_state.handle_move_block('left')
                elif event.key == pygame.K_RIGHT:
                    print('move right')
                    main_board.game_state.handle_move_block('right')
                elif event.key == pygame.K_DOWN:
                    fast_forward = True
                elif event.key == pygame.K_ESCAPE:
                    run = False
            elif event.type == pygame.KEYUP:
                if event.key == pygame.K_DOWN:
                    fast_forward = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if main_board.x_button.collidepoint(mouse):
                    print('Gate x')
                    main_board.game_state.handle_gate_action('x')
                elif main_board.z_button.collidepoint(mouse):
                    print('Gate z')
                    main_board.game_state.handle_gate_action('z')
                elif main_board.h_button.collidepoint(mouse):
                    print('Gate h')
                    main_board.game_state.handle_gate_action('h')
                elif main_board.cx_button.collidepoint(mouse):
                    print('Gate cx')
                    main_board.game_state.handle_gate_action('cx')
                elif main_board.cz_button.collidepoint(mouse):
                    print('Gate cz')
                    main_board.game_state.handle_gate_action('cz')
                elif main_board.ch_button.collidepoint(mouse):
                    print('The Controlled hadamard gate is not implemented yet')
                    # raise NotImplementedError(
                    #    'The Controlled hadamard gate is not implemented yet')
                    # main_board.game_state.handle_gate_action('ch')

                # Change speed of game
                elif main_board.raise_difficulty_button.collidepoint(mouse):
                    if main_board.difficulty < 0.101:
                        pass
                    else:
                        main_board.adjust_difficulty(-1)
                elif main_board.lower_difficulty_button.collidepoint(mouse):
                    main_board.adjust_difficulty(1)
            elif event.type == pygame.QUIT:
                run = False

        # Draw the updated state
        main_board.draw_board(gameDisplay, points)

        # Add a nice boarder
        pygame.draw.rect(gameDisplay, black, [main_board.hor_offset,
                                              main_board.ver_offset,
                                              main_board.boardWidth*main_board.square_hor,
                                              main_board.boardHeight*main_board.square_ver], 2)
        # Display drawn frame
        pygame.display.update()
        screen.blit(pygame.transform.scale(
            gameDisplay, screen.get_rect().size), (0, 0))
        pygame.display.flip()


class Board:
    def __init__(self, boardWidth, boardHeight, initial_square_size, initial_screensize, initial_state, difficulty):
        self.initialresolution = initial_screensize
        self.square_size = initial_square_size
        self.boardWidth = boardWidth
        self.boardHeight = boardHeight

        # Initialized rescaling factors
        self.rescale = (1, 1)
        self.square_hor = round(initial_square_size *
                                min(self.rescale)/self.rescale[1])
        self.square_ver = round(initial_square_size *
                                min(self.rescale)/self.rescale[0])

        # Offset of main tetris board (for centering-ish)
        self.ver_offset = self.square_ver*3
        self.hor_offset = self.square_hor*8

        # Get arrow image for blocks, and create the different rotations of the arrows
        self.original_arrow = pygame.image.load(
            './Pictures/Arrow.png').convert_alpha()
        self.arrow = pygame.transform.scale(
            self.original_arrow, (2*self.square_hor, self.square_ver))
        self.original_H_arrow = pygame.image.load(
            './Pictures/HadamardArrow.png').convert_alpha()
        self.H_arrow = pygame.transform.scale(
            self.original_H_arrow, (2*self.square_hor, 2*self.square_ver))
        self.arrows = [pygame.transform.rotate(
            self.arrow, 45*i) if i % 2 == 0 else pygame.transform.rotate(
            self.H_arrow, 45*(i-1)) for i in range(8)]

        # Get button images
        self.original_X = pygame.image.load('./Pictures/X.png').convert_alpha()
        self.Xpic = pygame.transform.scale(
            self.original_X, (2*self.square_hor, 2*self.square_ver))
        self.original_Z = pygame.image.load('./Pictures/Z.png').convert_alpha()
        self.Zpic = pygame.transform.scale(
            self.original_Z, (2*self.square_hor, 2*self.square_ver))
        self.original_H = pygame.image.load('./Pictures/H.png').convert_alpha()
        self.Hpic = pygame.transform.scale(
            self.original_H, (2*self.square_hor, 2*self.square_ver))
        self.original_CX = pygame.image.load(
            './Pictures/CX.png').convert_alpha()
        self.CXpic = pygame.transform.scale(
            self.original_CX, (3*self.square_hor, 2*self.square_ver))
        self.original_CZ = pygame.image.load(
            './Pictures/CZ.png').convert_alpha()
        self.CZpic = pygame.transform.scale(
            self.original_CZ, (3*self.square_hor, 2*self.square_ver))
        self.original_CH = pygame.image.load(
            './Pictures/CHgrey.png').convert_alpha()
        self.CHpic = pygame.transform.scale(
            self.original_CH, (3*self.square_hor, 2*self.square_ver))
        self.original_plus = pygame.image.load(
            './Pictures/Plus.png').convert_alpha()
        self.Pluspic = pygame.transform.scale(
            self.original_plus, (2*self.square_hor, 2*self.square_ver))
        self.original_minus = pygame.image.load(
            './Pictures/Minus.png').convert_alpha()
        self.Minuspic = pygame.transform.scale(
            self.original_minus, (2*self.square_hor, 2*self.square_ver))

        # Create background cells
        self.black_cell = None
        self.white_cell = None
        self.green_cell = None
        self.rescale_tiles()
        self.cells = [[None for _ in range(boardWidth)]
                      for _ in range(boardHeight)]

        self.difficulty = difficulty
        # Set up initial state of blocks
        self.game_state = initial_state

    def adjust_difficulty(self, direction):
        if self.difficulty >= 20:
            self.difficulty += direction*5
        elif self.difficulty >= 10:
            self.difficulty += direction*1
        elif self.difficulty >= 2.5:
            self.difficulty += direction*0.5
        elif self.difficulty >= 1:
            self.difficulty += direction*0.2
        elif self.difficulty >= 0.5:
            self.difficulty += direction*0.1
        else:
            self.difficulty += direction*0.01

    # For handling resizing of window

    def resize(self, new_size):
        # Implement minimum size of window, default 400x400px
        if new_size[0] < min_resolution[0] or new_size[1] < min_resolution[1]:
            pygame.display.set_mode(
                min_resolution, HWSURFACE | DOUBLEBUF | RESIZABLE)
            new_size = min_resolution
        else:
            pygame.display.set_mode(new_size, pygame.RESIZABLE)

        # Re-calculate scaling factors
        self.rescale = (new_size[0]/self.initialresolution[0],
                        new_size[1]/self.initialresolution[1])
        # Update square-sizes
        self.square_hor = round(
            self.square_size*min(self.rescale)/self.rescale[0])
        self.square_ver = round(
            self.square_size*min(self.rescale)/self.rescale[1])
        # Update offset of main game board
        self.ver_offset = self.square_ver*3
        self.hor_offset = self.square_hor*8

        # Apply rescaling to board and pieces
        self.rescale_tiles()
        self.rescale_pieces()
        self.rescale_buttons()

    def rescale_tiles(self):
        # Update cell sizes
        self.black_cell = pygame.surface.Surface(
            (self.square_hor, self.square_ver))
        self.black_cell.fill(black)
        self.white_cell = pygame.surface.Surface(
            (self.square_hor, self.square_ver))
        self.white_cell.fill(white)
        self.green_cell = pygame.surface.Surface(
            (self.square_hor//2, self.square_ver//2))
        self.green_cell.fill(green)

    def rescale_pieces(self):
        # Update block sizes
        self.arrow = pygame.transform.scale(
            self.original_arrow, (2*self.square_hor, self.square_ver))
        self.H_arrow = pygame.transform.scale(
            self.original_H_arrow, (2*self.square_hor, 2*self.square_ver))

    def rescale_buttons(self):
        self.Xpic = pygame.transform.scale(
            self.original_X, (2*self.square_hor, 2*self.square_ver))
        self.Zpic = pygame.transform.scale(
            self.original_Z, (2*self.square_hor, 2*self.square_ver))
        self.Hpic = pygame.transform.scale(
            self.original_H, (2*self.square_hor, 2*self.square_ver))
        self.CXpic = pygame.transform.scale(
            self.original_CX, (3*self.square_hor, 2*self.square_ver))
        self.CZpic = pygame.transform.scale(
            self.original_CZ, (3*self.square_hor, 2*self.square_ver))
        self.CHpic = pygame.transform.scale(
            self.original_CH, (3*self.square_hor, 2*self.square_ver))

    # Draw naked board with checker pattern

    def draw_board(self, gameDisplay, points):
        for H in range(self.boardHeight):
            for W in range(self.boardWidth):
                # Modulo to create checker patter
                if (H+W) % 2 == 0:
                    self.cells[H-1][W-1] = gameDisplay.blit(
                        self.white_cell, (self.hor_offset+self.square_hor*W, self.ver_offset + self.square_ver*H))
                else:
                    self.cells[H-1][W-1] = gameDisplay.blit(
                        self.black_cell, (self.hor_offset+self.square_hor*W, self.ver_offset + self.square_ver*H))

        # Draw pieces on top
        self.draw_pieces(gameDisplay)
        self.draw_buttons(gameDisplay)
        self.draw_upcoming(gameDisplay)
        self.drawtext(gameDisplay)
        self.drawscore(gameDisplay, points)

    def drawscore(self, gameDisplay, points):
        font = pygame.font.Font('freesansbold.ttf', 30)
        text = font.render(str(points), True, 'black')
        gameDisplay.blit(text, (750, 100))
        text = font.render('score', True, 'black')
        gameDisplay.blit(text, (720, 60))
        pygame.draw.rect(gameDisplay, 'black', pygame.Rect(
            710, 60, 100, 70), 2, border_radius=10)

    def drawtext(self, gameDisplay):
        font = pygame.font.Font('freesansbold.ttf', 30)
        text = font.render('upcoming blocks', True, 'blue')
        gameDisplay.blit(text, (650, 220))

        pygame.draw.rect(gameDisplay, 'BLUE', pygame.Rect(
            660, 260, 230, 550), 2, border_radius=10)

        text2 = font.render('buttons', True, 'purple')
        gameDisplay.blit(text2, (50, 70))
        pygame.draw.rect(gameDisplay, 'purple', pygame.Rect(
            23, 100, 230, 300), 2, border_radius=10)

        font2 = pygame.font.Font('freesansbold.ttf', 40)
        font2.set_bold(True)
        font2.set_italic(True)
        text3 = font2.render('QuanTris', True, 'red')
        gameDisplay.blit(text3, (370, 55))

        font3 = pygame.font.Font('freesansbold.ttf', 24)
        font3.set_bold(True)
        font3.set_italic(True)

        difficulty_text = font3.render(
            f'Difficulty: {1/self.difficulty:.2f}', True, 'red')
        pygame.draw.rect(gameDisplay, 'purple', pygame.Rect(
            20, 520, 200, 90), 2, border_radius=10)
        gameDisplay.blit(difficulty_text, (self.hor_offset-7*self.square_hor,
                                           self.ver_offset+11*self.square_ver))

    def draw_upcoming(self, gameDisplay):

        vertpos = -5

        for block in self.game_state.upcoming_blocks:
            pos, orientations = block.get_position_orientation()
            # Relative spacing for multi-qubit blocks
            relx = 0
            rely = 0
            if block.number_of_qubits == 1:
                for orientation in orientations:
                    gameDisplay.blit(self.arrows[orientation], (self.hor_offset+self.square_hor*((pos[0]+relx+7)),
                                                                self.ver_offset+self.square_ver*(self.boardHeight-(pos[1]+rely+1+vertpos)), self.square_hor*self.rescale[1], -self.square_ver*self.rescale[0]))

            if block.number_of_qubits == 2:
                sqrs = list(block.covered_squares())
                i = 0
                for orientation in orientations:
                    gameDisplay.blit(self.arrows[orientation], (self.hor_offset+self.square_hor*(12+3*i),
                                                                self.ver_offset+self.square_ver *
                                                                (self.boardHeight -
                                                                 (20+ vertpos)),
                                                                self.square_hor*self.rescale[1], -self.square_ver*self.rescale[0]))
                 #   print((sqrs[i][0]+relx+7), self.boardHeight -(sqrs[i][1]+rely+vertpos))
                    i += 1
            vertpos -= 3

    def draw_pieces(self, gameDisplay):
        # For each block on the board
        for block in self.game_state.blocks:
            pos, orientations = block.get_position_orientation()
            # Relative spacing for multi-qubit blocks
            relx = 0
            rely = 0

            for orientation in orientations:
                # Re-position blitting to align with underlying logic grid
                if orientation in [1, 2, 3]:
                    rely += 1
                if orientation in [3, 4, 5]:
                    relx -= 1

                gameDisplay.blit(self.arrows[orientation], (self.hor_offset+self.square_hor*((pos[0]+relx)),
                                                            self.ver_offset+self.square_ver*(self.boardHeight-(pos[1]+rely+1)), self.square_hor*self.rescale[1], -self.square_ver*self.rescale[0]))
                # Reset repositioning
                if orientation in [1, 2, 3]:
                    rely -= 1
                if orientation in [3, 4, 5]:
                    relx += 1

                # Spacing between multi qubit blocks
                relx += 2
                ''' #Tight layout
                if orientation in [2, 6]:
                    relx += 1
                else:
                    relx += 2
                '''
            #for pos in block.covered_squares():
            #    gameDisplay.blit(self.green_cell, (self.hor_offset+self.square_hor*((pos[0])),
            #                                       self.ver_offset+self.square_ver*(self.boardHeight-(pos[1]+1)), self.square_hor*self.rescale[1]//2, -self.square_ver*self.rescale[0]//2))

    def draw_buttons(self, gameDisplay):
        # X button
        self.x_button = gameDisplay.blit(self.Xpic, (self.hor_offset-7*self.square_hor,
                                         self.ver_offset, 2*self.square_hor*self.rescale[1], 2*self.square_ver*self.rescale[0]))
        self.z_button = gameDisplay.blit(self.Zpic, (self.hor_offset-7*self.square_hor,
                                         self.ver_offset+3*self.square_ver, 2*self.square_hor*self.rescale[1], 2*self.square_ver*self.rescale[0]))
        self.h_button = gameDisplay.blit(self.Hpic, (self.hor_offset-7*self.square_hor,
                                         self.ver_offset+6*self.square_ver, 2*self.square_hor*self.rescale[1], 2*self.square_ver*self.rescale[0]))
        self.cx_button = gameDisplay.blit(self.CXpic, (self.hor_offset-4*self.square_hor,
                                                       self.ver_offset, 3*self.square_hor*self.rescale[1], 2*self.square_ver*self.rescale[0]))
        self.cz_button = gameDisplay.blit(self.CZpic, (self.hor_offset-4*self.square_hor,
                                                       self.ver_offset+3*self.square_ver, 3*self.square_hor*self.rescale[1], 2*self.square_ver*self.rescale[0]))
        self.ch_button = gameDisplay.blit(self.CHpic, (self.hor_offset-4*self.square_hor,
                                                       self.ver_offset+6*self.square_ver, 3*self.square_hor*self.rescale[1], 2*self.square_ver*self.rescale[0]))

        self.raise_difficulty_button = gameDisplay.blit(self.Pluspic, (self.hor_offset-7*self.square_hor,
                                                                       self.ver_offset+12*self.square_ver, 2*self.square_hor*self.rescale[1], 2*self.square_ver*self.rescale[0]))
        self.lower_difficulty_button = gameDisplay.blit(self.Minuspic, (self.hor_offset-4*self.square_hor,
                                                                        self.ver_offset+12*self.square_ver, 2*self.square_hor*self.rescale[1], 2*self.square_ver*self.rescale[0]))


# Call main loop
main()

# When exiting main loop, quit from pygame & python
pygame.quit()
