'use strict';
// Native-script overlay for iconic-dish NAMES — v0.62.x (operator A1: keep the
// original expression). Keyed `${slug}::${dish.name.toLowerCase()}` → the dish's
// name in its origin script. Merged onto iconicDishes[].local at load in
// nation-overlay.js (only when `local` is absent). Surfaces as "Dish Name 北京烤鸭"
// in the plate / cards (ArrivalPlate already renders d.local).
//
// Batched by cuisine. Japanese already carries inline `local` in nation-overlay.js,
// so it is not repeated here. Latin-script cuisines (Italian, French, American…)
// need no separate script and are intentionally omitted.
module.exports = {
  // ── Chinese (batch 1) ──
  'chinese::peking duck': '北京烤鸭',
  'chinese::xiao long bao': '小笼包',
  'chinese::mapo tofu': '麻婆豆腐',
  'chinese::kung pao chicken': '宫保鸡丁',
  'chinese::sweet and sour pork': '糖醋里脊',
  'chinese::hot pot': '火锅',
  'chinese::zhajiangmian': '炸酱面',
  'chinese::jianbing': '煎饼',
  'chinese::baozi': '包子',
  'chinese::jiaozi': '饺子',
  'chinese::mantou': '馒头',
  'chinese::lanzhou lamian': '兰州拉面',
  'chinese::biang biang noodles': 'biángbiáng面',
  "chinese::beggar's chicken": '叫花鸡',
  'chinese::west lake fish': '西湖醋鱼',
  'chinese::yangzhou fried rice': '扬州炒饭',
  'chinese::shaanxi rou jia mo': '肉夹馍',
  'chinese::chongqing noodles': '重庆小面',
  'chinese::chinese new year nian gao': '年糕',
  'chinese::moon cake': '月饼',
  'chinese::zongzi': '粽子',
  'chinese::mooncake': '月饼',
  'chinese::chow mein': '炒面',
  'chinese::lo mein': '捞面',
  'chinese::egg drop soup': '蛋花汤',
  'chinese::hot and sour soup': '酸辣汤',
  'chinese::spring rolls': '春卷',
};
