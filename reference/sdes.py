"""独立的列表位运算参考实现；参数逐项抄录课程文档，而非调用 JS。"""
import json
import sys

P10 = [3, 5, 2, 7, 4, 10, 1, 9, 8, 6]
P8 = [6, 3, 7, 4, 8, 5, 10, 9]
IP = [2, 6, 3, 1, 4, 8, 5, 7]
INV = [4, 1, 3, 5, 7, 2, 8, 6]
EP = [4, 1, 2, 3, 2, 3, 4, 1]
P4 = [2, 4, 3, 1]
S0 = [[1, 0, 3, 2], [3, 2, 1, 0], [0, 2, 1, 3], [3, 1, 0, 2]]
S1 = [[0, 1, 2, 3], [2, 3, 1, 0], [3, 0, 1, 2], [2, 1, 0, 3]]


def permute(data, table):
    return [data[i - 1] for i in table]


def rotate_halves(data, amount):
    left, right = data[:5], data[5:]
    return left[amount:] + left[:amount] + right[amount:] + right[:amount]


def expand_key(key):
    data = permute([int(x) for x in key], P10)
    data = rotate_halves(data, 1)
    first = permute(data, P8)
    return first, permute(rotate_halves(data, 2), P8)


def round_function(data, key):
    left, right = data[:4], data[4:]
    expanded = permute(right, EP)
    mixed = [a ^ b for a, b in zip(expanded, key)]
    outputs = []
    for half, box in [(mixed[:4], S0), (mixed[4:], S1)]:
        row = half[0] * 2 + half[3]
        col = half[1] * 2 + half[2]
        value = box[row][col]
        outputs.extend([value // 2, value % 2])
    return [a ^ b for a, b in zip(left, permute(outputs, P4))] + right


def crypt(block, key, decrypt=False):
    if len(block) != 8 or len(key) != 10 or set(block + key) - {'0', '1'}:
        raise ValueError('8-bit block and 10-bit binary key required')
    keys = expand_key(key)
    if decrypt:
        keys = keys[::-1]
    data = permute([int(x) for x in block], IP)
    data = round_function(data, keys[0])
    data = round_function(data[4:] + data[:4], keys[1])
    return ''.join(map(str, permute(data, INV)))


if __name__ == '__main__':
    if len(sys.argv) == 3:
        print(crypt(sys.argv[1], sys.argv[2]))
    else:
        vectors = json.load(sys.stdin)
        json.dump([crypt(v['plain'], v['key']) for v in vectors], sys.stdout)
