import numpy as np
from block import Block
import copy
import gates


def check_if_overlap(blocks):  # this also checks if all blocks are in bounds
	if len(blocks) == 0:
		return False
	current_block = blocks[-1]
	# check bounds
	# print([block.covered_squares() for block in blocks])
	# print(current_block.covered_squares())
	print(current_block.covered_squares())
	for square in current_block.covered_squares():
		if not 0 <= square[0] <= 9 or not 0 <= square[1] <= 19:
			return True
	# check overlap
	for other_block in blocks[:-1]:  # only check if the last block overlaps any of the other blocks
		for current_block_covered_square in current_block.covered_squares():
			if current_block_covered_square in other_block.covered_squares():
				return True
	return False

def remove_interference_blocks(blocks):
	# only check for interference against current block
	current_block = blocks[-1]
	for other_block in blocks[:-1]:
		if current_block.covered_squares() == other_block.covered_squares():
			if np.all(np.isclose(current_block.state_vector, - other_block.state_vector)):  # if the state vectors cancel
				blocks.remove(other_block)  # remove the blocks canceled by interference
				blocks.remove(current_block)
				return blocks,True  # at most one block will cancel from interference, so we can return now
	return blocks,False  # no block matched for interference so they all stay


class QuantumTetris:
	def __init__(self):
		self.blocks = [Block()]  # start with one block already on the board
		self.upcoming_blocks = []
		self.points = 0
		
		# have the board start with a bunch of blocks already there
		number_of_initial_blocks = 10
		while len(self.upcoming_blocks) < number_of_initial_blocks:
			print('Creating new block')
			self.upcoming_blocks.append(Block(position=np.array([np.random.randint(1, 6),18])))
		while len(self.blocks) < number_of_initial_blocks:
			self.update()
	
	def handle_gate_action(self, gate):
		# apply quantum gate, and check to make sure no overlap
		tentative_blocks = copy.deepcopy(self.blocks)
		current_block = tentative_blocks[-1]
		state_vector = current_block.state_vector
		# apply gates
		if gate == 'x':
			if current_block.number_of_qubits == 1:
				state_vector[:] = gates.X.dot(state_vector)
			elif current_block.number_of_qubits == 2:
				state_vector[:] = np.kron(gates.X, np.eye(2)).dot(state_vector)
			else:
				raise Exception('Wrong number of qubits')
		elif gate == 'z':
			if current_block.number_of_qubits == 1:
				state_vector[:] = gates.Z.dot(state_vector)
			elif current_block.number_of_qubits == 2:
				state_vector[:] = np.kron(gates.Z, np.eye(2)).dot(state_vector)
			else:
				raise Exception('Wrong number of qubits')
		elif gate == 'h':
			if current_block.number_of_qubits == 1:
				state_vector[:] = gates.H.dot(state_vector)
			else:
				print('Ignoring H gate on 2 qubit block')
		elif gate == 'cx':
			if current_block.number_of_qubits == 2:
				state_vector[:] = gates.CX.dot(state_vector)
			else:
				print('Ignoring CX gate on 1 qubit block')
		elif gate == 'cz':
			if current_block.number_of_qubits == 2:
				state_vector[:] = gates.CZ.dot(state_vector)
			else:
				print('Ignoring CZ gate on 1 qubit block')
		elif gate == 'swap':
			state_vector[:] = gates.Swap.dot(state_vector)
		else:
			raise Exception(f'Unknown gate {gate}')
		
		tentative_blocks, did_blocks_cancel = remove_interference_blocks(tentative_blocks)
		if check_if_overlap(tentative_blocks) == False:
			self.blocks = tentative_blocks
			if did_blocks_cancel:
				self.points += 1
				self.blocks.append(self.upcoming_blocks.pop(0))  # take an upcoming block an put in in the current blocks
	
	def handle_move_block(self, direction):  # direction = 'left' or 'right'
		tentative_blocks = copy.deepcopy(self.blocks)
		current_block = tentative_blocks[-1]
		current_position = current_block.position
		if direction == 'left':
			current_position[0] -= 1
		elif direction == 'right':
			current_position[0] += 1
		
		tentative_blocks, did_blocks_cancel = remove_interference_blocks(tentative_blocks)
		if check_if_overlap(tentative_blocks) == False:
			self.blocks = tentative_blocks
			if did_blocks_cancel:
				self.points += 1
				self.blocks.append(self.upcoming_blocks.pop(0))  # take an upcoming block an put in in the current blocks
	
	def getpoints(self):
		return self.points 


	# it is the main game logic
	def update(self):
		# generate upcoming blocks
		while len(self.upcoming_blocks) < 5:
			print('Creating new block')
			self.upcoming_blocks.append(Block())
		
		
		# move block down
		self.blocks[-1].position[1] -= 1
		self.blocks, did_blocks_cancel = remove_interference_blocks(self.blocks)
		if did_blocks_cancel:
			self.points += 1
			self.blocks.append(self.upcoming_blocks.pop(0))  # take an upcoming block an put in in the current blocks
			self.blocks[-1].position[1] -= 1  # need the block to have (tried to) fall a bit, so we can detect if the game is lost or not
		else: # check if the blocks cancel after moving them down two:
			self.blocks[-1].position[1] -= 1
			self.blocks, did_blocks_cancel = remove_interference_blocks(self.blocks)
			if did_blocks_cancel:
				self.points += 1
				self.blocks.append(self.upcoming_blocks.pop(0))  # take an upcoming block an put in in the current blocks
				self.blocks[-1].position[1] -= 1  # need the block to have (tried to) fall a bit, so we can detect if the game is lost or not
			else:  # they don't cancel two moves ahead, so undo and go back to one move ahead
				self.blocks[-1].position[1] += 1
		if check_if_overlap(self.blocks):
			if self.blocks[-1].position[1] >= 18:
				print('You lose')
				quit()
			print('Done moving this block. adding a new one')
			# if there's an overlap, then the block hit the ground or hit another blocks, and another block should be started
			self.blocks[-1].position[1] += 1  # undo last move because there was overlap
			self.blocks.append(self.upcoming_blocks.pop(0))  # take an upcoming block an put in in the current blocks
