import { Injectable } from '@nestjs/common';
import { RedisService } from './modules/redis/redis.service';

/**
 *! App Service
 */
@Injectable()
export class AppService {
  constructor(private readonly redisService: RedisService) {}

  // async onModuleInit() {
  //     console.log(await this.redisService.ping());
  // }

  getHello(): string {
    const environment =
      process.env.NODE_ENV === 'production'
        ? 'Production'
        : process.env.NODE_ENV === 'development'
          ? 'Development'
          : (process.env.NODE_ENV ?? 'Unknown');

    const statusColor =
      process.env.NODE_ENV === 'production' ? '#dcfce7' : '#fef3c7';

    const statusTextColor =
      process.env.NODE_ENV === 'production' ? '#166534' : '#92400e';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Job Seeker API</title>
<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
}
body{
    font-family:Arial, Helvetica, sans-serif;
    background:#f8fafc;
    color:#1f2937;
}
.container{
    max-width:900px;
    margin:60px auto;
    background:white;
    border-radius:16px;
    box-shadow:0 10px 30px rgba(0,0,0,.08);
    overflow:hidden;
}
.header{
    background:#2563eb;
    color:white;
    padding:40px;
    text-align:center;
}
.header img{
    width:90px;
    margin-bottom:20px;
}
.header h1{
    font-size:2rem;
}
.content{
    padding:40px;
}
.status{
    display:inline-block;
    padding:8px 16px;
    background:#dcfce7;
    color:#166534;
    border-radius:20px;
    margin-bottom:20px;
    font-weight:bold;
}
.card{
    background:#f9fafb;
    border:1px solid #e5e7eb;
    border-radius:10px;
    padding:20px;
    margin-top:20px;
}
ul{
    margin-top:10px;
}
li{
    margin:10px 0;
}
a{
    color:#2563eb;
    text-decoration:none;
}
.footer{
    text-align:center;
    padding:20px;
    color:#6b7280;
    border-top:1px solid #eee;
}
</style>
</head>
<body>

<div class="container">

<div class="header">
<img src="https://i.imgur.com/Bk96b3D.png" alt="Logo"/>
<h1>Job Seeker API</h1>
<p>Backend API for the Job Seeker Platform</p>
</div>

<div class="content">

<div class="status">
🟢 API Running
</div>

<h2>Welcome 👋</h2>

<p>
Welcome to the Job Seeker API.
This API powers authentication, jobs, applications,
analytics and user management.
</p>

<div class="card">
<h3>Public Routes</h3>

<ul>
<li><a href="/api/docs">📘 Swagger Documentation</a></li>
<li><a href="/api/metrics">📈 Prometheus Metrics</a></li>
<li><a href="/api/health">❤️ Health Check</a></li>
</ul>
</div>

<div class="card">
<h3>API Information</h3>

<ul>
<li><strong>Version:</strong> 1.0.0</li>
<li><strong>Status:</strong> Running</li>
<li><strong>Environment:</strong> ${environment}</li>
</ul>
</div>

</div>

<div class="footer">
Made with ❤️ using NestJS
</div>

</div>

</body>
</html>
`;
  }
}
