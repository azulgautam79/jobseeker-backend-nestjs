output "vpc_id" {
  value = aws_vpc.main.id
}

output "subnet_id" {
  value = aws_subnet.public.id
}

output "internet_gateway_id" {
  value = aws_internet_gateway.main.id
}

output "public_ip" {
  value = aws_instance.jobseeker.public_ip
}

output "public_dns" {
  value = aws_instance.jobseeker.public_dns
}

output "elastic_ip" {
  value = aws_eip.jobseeker.public_ip
}