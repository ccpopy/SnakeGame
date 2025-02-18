#include <stdint.h>
#include <string.h>
#include <stdio.h>

#define SECRET_KEY_SIZE 32  // 密钥大小

// 十六进制格式的密钥
unsigned char SECRET_KEY[SECRET_KEY_SIZE] = {
    0xbf, 0x67, 0x0f, 0x89, 0x67, 0x50, 0xf7, 0xbb,
    0x48, 0x8f, 0xb9, 0x83, 0xd0, 0x93, 0xcd, 0x8d,
    0x16, 0xd3, 0x1b, 0x4a, 0xa5, 0xec, 0xcc, 0xbb,
    0x85, 0x54, 0x4a, 0x89, 0xfa, 0x20, 0x91, 0xe9
};

// 游戏状态
static int food_eaten = 0;
static int final_score = 0;

// 初始化游戏会话，记录开始时间（毫秒）
void startSession() {
    food_eaten = 0;
    final_score = 0;
}

// 记录吃到一个食物
void recordFood() {
    food_eaten++;
}

// 设置最终分数
void setScore(int score) {
    final_score = score;
}

// 返回已吃食物的数量
int getFoodEaten() {
    return food_eaten;
}

// 更高效的哈希算法（采用简单的FNV-1a算法）
unsigned int generateSignature(int currentTime) {
    // FNV-1a 哈希算法的初始值
    unsigned int hash = 0x811C9DC5u;

    // 使用 SECRET_KEY 生成签名
    for (int i = 0; i < SECRET_KEY_SIZE; i++) {
        hash ^= (unsigned int)SECRET_KEY[i];  // 对密钥进行异或操作
        hash *= 0x01000193u;     // FNV-1a 哈希算法的质数
    }

    // 基于最终分数、食物数量和游戏时长计算哈希
    hash ^= (unsigned int)final_score;      // 异或最终分数
    hash += (unsigned int)food_eaten;       // 累加已吃食物数量
    hash ^= (unsigned int)currentTime;      // 异或当前时间（毫秒）

    hash ^= (hash >> 16);     // 混合高16位和低16位

    return hash;
}

int main() {
    return 0;
}
