import {Auth, AuthUser, UserToken} from '@app/keycloak-auth';
import {NotFound, notFound} from '@mean-stream/nestx';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseArrayPipe,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiTags, getSchemaPath} from '@nestjs/swagger';
import {FilterQuery} from 'mongoose';
import {AssignmentAuth} from './assignment-auth.decorator';
import {CreateAssignmentDto, ReadAssignmentDto, UpdateAssignmentDto,} from './assignment.dto';
import {Assignment} from './assignment.schema';
import {AssignmentService} from './assignment.service';
import {MemberService} from "@app/member";

const forbiddenResponse = 'Not owner or invalid Assignment-Token.';

@Controller('assignments')
@ApiTags('Assignments')
export class AssignmentController {
  constructor(
    private readonly assignmentService: AssignmentService,
    private readonly memberService: MemberService,
  ) {
  }

  @Post()
  @Auth({optional: true})
  @ApiCreatedResponse({type: Assignment})
  async create(
    @Body() dto: CreateAssignmentDto,
    @AuthUser() user?: UserToken,
  ) {
    return this.assignmentService.create(dto, user?.sub);
  }

  @Get()
  @ApiOkResponse({type: [ReadAssignmentDto]})
  async findAll(
    @Query('archived', new ParseBoolPipe({optional: true})) archived?: boolean,
    @Query('createdBy') createdBy?: string,
    @Query('ids') ids?: string,
    @Query('members', ParseArrayPipe) memberIds?: string[],
  ) {
    const filter: FilterQuery<Assignment> = {};
    if (archived !== undefined) {
      filter.archived = archived || {$ne: true};
    }
    if (createdBy) {
      (filter.$or ||= []).push({createdBy});
    }
    if (ids) {
      (filter.$or ||= []).push({_id: {$in: ids.split(',')}});
    }
    if (memberIds) {
      const members = await this.memberService.findAll({user: {$in: memberIds}});
      (filter.$or ||= []).push({_id: {$in: members.map(m => m.parent)}});
    }
    return (await this.assignmentService.findAll(filter)).map(a => this.assignmentService.mask(a.toObject()));
  }

  @Get(':id')
  @Auth({optional: true})
  @NotFound()
  @ApiOkResponse({
    description: 'Result is an Assignment when you are author or the Assignment-Token header matches, otherwise some properties are omitted.',
    schema: {
      oneOf: [
        {$ref: getSchemaPath(Assignment)},
        {$ref: getSchemaPath(ReadAssignmentDto)},
      ],
    },
  })
  @ApiHeader({name: 'assignment-token', required: false})
  async findOne(
    @Param('id') id: string,
    @Headers('assignment-token') token?: string,
    @AuthUser() user?: UserToken,
  ): Promise<Assignment | ReadAssignmentDto> {
    const assignment = await this.assignmentService.findOne(id) ?? notFound(id);
    if (this.assignmentService.isAuthorized(assignment, user, token)) {
      return assignment;
    }
    return this.assignmentService.mask(assignment.toObject());
  }

  @Patch(':id')
  @NotFound()
  @AssignmentAuth({forbiddenResponse})
  @ApiOkResponse({type: Assignment})
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
  ): Promise<Assignment | null> {
    return this.assignmentService.update(id, dto);
  }

  @Delete(':id')
  @NotFound()
  @AssignmentAuth({forbiddenResponse})
  @ApiOkResponse({type: Assignment})
  async remove(
    @Param('id') id: string,
  ): Promise<Assignment | null> {
    return this.assignmentService.remove(id);
  }
}
