// IP属地获取工具
// 使用真实IP地址查询API获取用户IP属地

/**
 * 从请求中获取客户端真实IP地址
 * @param {Object} req - Express请求对象
 * @returns {String} - 客户端IP地址
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    '0.0.0.0'
  );
}

/**
 * 使用IP查询API获取IP属地（免费API）
 * @param {String} ip - IP地址
 * @returns {Promise<String>} - IP属地（如"北京"、"广东"）
 */
async function getIPLocation(ip) {
  try {
    // 跳过本地IP和私有IP
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      // 本地开发环境，返回默认值或使用测试IP
      return '本地';
    }

    // 使用免费的IP查询API（多个备选，提高成功率）
    const apis = [
      // API 1: ipapi.co (免费，每月1000次请求)
      async () => {
        const axios = require('axios');
        const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
          timeout: 3000
        });
        if (response.data && response.data.region) {
          // 转换为省份名称
          const region = response.data.region;
          return convertRegionToProvince(region);
        }
        return null;
      },
      
      // API 2: ip-api.com (免费，每分钟45次请求)
      async () => {
        const axios = require('axios');
        const response = await axios.get(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
          timeout: 3000
        });
        if (response.data && response.data.status === 'success' && response.data.regionName) {
          return convertRegionToProvince(response.data.regionName);
        }
        return null;
      },
      
      // API 3: 使用ip.sb (免费，简单)
      async () => {
        const axios = require('axios');
        const response = await axios.get(`https://api.ip.sb/geoip/${ip}`, {
          timeout: 3000
        });
        if (response.data && response.data.region) {
          return convertRegionToProvince(response.data.region);
        }
        return null;
      }
    ];

    // 依次尝试API，直到成功
    for (const api of apis) {
      try {
        const location = await api();
        if (location) {
          return location;
        }
      } catch (error) {
        // 继续尝试下一个API
        continue;
      }
    }

    // 所有API都失败，返回未知
    return '未知';
  } catch (error) {
    console.error('获取IP属地失败:', error.message);
    return '未知';
  }
}

/**
 * 将地区名称转换为省份名称（简化版）
 * @param {String} region - 地区名称
 * @returns {String} - 省份名称
 */
function convertRegionToProvince(region) {
  if (!region) return '未知';
  
  // 省份映射表（简化版，可以根据需要扩展）
  const provinceMap = {
    '北京': '北京',
    '上海': '上海',
    '天津': '天津',
    '重庆': '重庆',
    '河北': '河北',
    '山西': '山西',
    '内蒙古': '内蒙古',
    '辽宁': '辽宁',
    '吉林': '吉林',
    '黑龙江': '黑龙江',
    '江苏': '江苏',
    '浙江': '浙江',
    '安徽': '安徽',
    '福建': '福建',
    '江西': '江西',
    '山东': '山东',
    '河南': '河南',
    '湖北': '湖北',
    '湖南': '湖南',
    '广东': '广东',
    '广西': '广西',
    '海南': '海南',
    '四川': '四川',
    '贵州': '贵州',
    '云南': '云南',
    '西藏': '西藏',
    '陕西': '陕西',
    '甘肃': '甘肃',
    '青海': '青海',
    '宁夏': '宁夏',
    '新疆': '新疆',
    '台湾': '台湾',
    '香港': '香港',
    '澳门': '澳门',
    'Beijing': '北京',
    'Shanghai': '上海',
    'Tianjin': '天津',
    'Chongqing': '重庆',
    'Guangdong': '广东',
    'Zhejiang': '浙江',
    'Jiangsu': '江苏',
    'Shandong': '山东',
    'Sichuan': '四川',
    'Hunan': '湖南',
    'Hubei': '湖北',
    'Fujian': '福建',
    'Henan': '河南',
    'Hebei': '河北',
    'Liaoning': '辽宁',
    'Jilin': '吉林',
    'Heilongjiang': '黑龙江',
    'Anhui': '安徽',
    'Jiangxi': '江西',
    'Shaanxi': '陕西',
    'Shanxi': '山西',
    'Yunnan': '云南',
    'Guizhou': '贵州',
    'Guangxi': '广西',
    'Hainan': '海南',
    'Xinjiang': '新疆',
    'Tibet': '西藏',
    'Inner Mongolia': '内蒙古',
    'Ningxia': '宁夏',
    'Qinghai': '青海',
    'Gansu': '甘肃',
    'Taiwan': '台湾',
    'Hong Kong': '香港',
    'Macau': '澳门'
  };

  // 直接匹配
  if (provinceMap[region]) {
    return provinceMap[region];
  }

  // 包含匹配
  for (const [key, value] of Object.entries(provinceMap)) {
    if (region.includes(key)) {
      return value;
    }
  }

  // 如果都不匹配，返回原始值（可能已经是中文省份名）
  return region;
}

module.exports = {
  getClientIP,
  getIPLocation
};




