import { Controller, Post, Get, Param, Res }   from "@nestjs/common";
import { spawn, exec } from 'child_process';
import { Response } from 'express';
import process from "node:process";
import { ConfigService} from "@nestjs/config";


@Controller('admin-panel' )
export class AdminController {
  constructor(private configService: ConfigService) {}

  @Post('restart-server')
  restartServer(@Res() res: Response) {
    const env = this.configService.get<string>('ENV');
    let scriptPath: string;

    switch (env) {
      case 'local':
        scriptPath = '/home/ubuntu/of-software/backend/of-software/scripts/restart-backend.sh';
        break;
      case 'DEV':
      case 'development':
      case 'production':
      default:
        scriptPath = '/Users/oleksandrsonich/sites/joefans/backend/of-software/scripts/restart-backend.sh';
        break;
    }

    res.json({success: true, message: 'Server restart initiated'});

    setTimeout(() => {
      spawn(
        'bash',
        [getRestartScriptPath()],
        {
          detached: true,
          stdio: 'ignore',
        },
      ).unref();
    }, 500); // дать фронту отправить response
  }
  //
}
