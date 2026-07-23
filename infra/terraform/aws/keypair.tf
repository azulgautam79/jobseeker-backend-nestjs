resource "aws_key_pair" "jobseeker" {
  key_name   = "jobseeker-aws"
  public_key = file("${pathexpand("~/.ssh/jobseeker-aws.pub")}")

  tags = {
    Name = "jobseeker-aws"
  }
}