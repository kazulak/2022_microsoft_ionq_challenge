import numpy as np

eighth_rotation = 1 / np.sqrt(2) * np.array([[1, -1], [1, 1]], dtype='float')
collapse_first_qubit = np.array([[1, 1, 0, 0], [0, 0, 1, 1]], dtype='float')
collapse_second_qubit = np.array([[1, 0, 1, 0], [0, 1, 0, 1]], dtype='float')


def get_orientation_of_single_qubit(qubit):
	assert qubit.shape == (2,), 'Only a single qubit should be passed to this function'
	orientation = 0  # orientation start from x axis, and rotates counter-clockwise. 0 is right, 1 is up-right, 2 is up ...
	test_vector = np.array([1, 0])
	while orientation < 8:
		if qubit.dot(test_vector) > 0.999:  # can't compare to 1 because of floating point errors
			return orientation
		else:
			orientation += 1
			test_vector = eighth_rotation.dot(test_vector)
	raise ValueError(f'State {qubit} does not match any of the 8 arrow directions')  # the code should never reach here


class Block:
	def __init__(self, number_of_qubits=None, state_vector=None, position=None):
		if number_of_qubits is None:
			number_of_qubits = np.random.choice([1,2])
		self.number_of_qubits = number_of_qubits
		if state_vector is not None:
			assert state_vector.dtype == 'float', 'Storing state vector in an int array causes problems with superpositions (hadamard)'
			self.state_vector = state_vector
		else:  # if state vector was not given in the argument, define one
			if number_of_qubits == 1:
				self.state_vector = np.array([1, 0], dtype='float')  # state vector. coefficients of [|0>,|1>]
				for i in range(np.random.randint(0, 8)):  # pick random rotation, 0-7 eighths
					self.state_vector = eighth_rotation.dot(self.state_vector)
			elif number_of_qubits == 2:
				self.state_vector = np.array([1, 0, 0, 0], dtype='float')  # state vector. coefficients of [|00>,|01>,|10>,|11>]
				for i in range(np.random.randint(0, 4)):  # pick random rotation, 0-3 quarters
					self.state_vector = np.kron(np.eye(2), eighth_rotation).dot(self.state_vector)  # apply the rotation twice so no 45 degree angles, so we can map it to two arrows
					self.state_vector = np.kron(np.eye(2), eighth_rotation).dot(self.state_vector)  # effectively, only quarter rotations
				for i in range(np.random.randint(0, 4)):  # pick random rotation, 0-3 quarters
					self.state_vector = np.kron(eighth_rotation, np.eye(2)).dot(self.state_vector)
					self.state_vector = np.kron(eighth_rotation, np.eye(2)).dot(self.state_vector)
			else:
				raise NotImplementedError('Only 1 and 2 qubit blocks are supported')
		if position is None:
			self.position = np.array([5, 19])
		else:
			assert type(position) == np.ndarray, 'Position needs to be numpy array to do vector math on it'
			self.position = position
	
	def covered_squares(self):
		if self.number_of_qubits == 1:
			arrow_direction = np.round(self.state_vector)  # we have to map (.707,.707) to (1,1) for blocks
			arrow_direction = arrow_direction.astype('int')  # because position is an int, so keep everything as ints
			return {tuple(self.position),
			        tuple(self.position + arrow_direction)}
		elif self.number_of_qubits == 2:
			arrow_1_direction = np.round(collapse_first_qubit.dot(self.state_vector))
			arrow_2_direction = np.round(collapse_second_qubit.dot(self.state_vector))
			return {tuple(self.position),
			        tuple(self.position + arrow_1_direction),
			        tuple(self.position + np.array([2, 0])),
			        tuple(self.position + np.array([2, 0]) + arrow_2_direction)}
		raise Exception
	
	def get_position_orientation(self):
		# will calculate orientation from self.state_vector
		if self.number_of_qubits == 1:
			orientation = get_orientation_of_single_qubit(self.state_vector)
			return self.position, [orientation]  # orientation should be a list, to match the format of 2 qubits
		elif self.number_of_qubits == 2:
			first_qubit = collapse_first_qubit.dot(self.state_vector)
			second_qubit = collapse_second_qubit.dot(self.state_vector)
			orientations = [
				get_orientation_of_single_qubit(first_qubit),
				get_orientation_of_single_qubit(second_qubit)
			]
			return self.position, orientations
		else:
			raise NotImplementedError('Only 1 and 2 qubit blocks are supported')
